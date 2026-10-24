// Browser port of the single-page ClearText path in app.py.
// ONNX Runtime Web runs weights/model.onnx. OpenCV.js runs resize,
// connected components, threshold, and blur. The page is HTML5:
// canvas holds pixels, and both libraries are WebAssembly.

const MODEL_URL = "../weights/model.onnx";
const SAMPLE_URL = "../data/boston_cooking_a.jpg";
const NET_WIDTH = 1280;
const NET_HEIGHT = 960;
const MEAN = [0.485 * 255, 0.456 * 255, 0.406 * 255];
const VARIANCE = [0.229 * 255, 0.224 * 255, 0.225 * 255];

const statusEl = document.getElementById("status");
const progressWrap = document.getElementById("progress-wrap");
const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const progressTrack = document.getElementById("progress-track");
const processBtn = document.getElementById("process");
const downloadBtn = document.getElementById("download");
const originalCanvas = document.getElementById("original");
const resultCanvas = document.getElementById("result");
const originalFigure = document.getElementById("original-figure");
const resultFigure = document.getElementById("result-figure");

let session = null;
let source = null;

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", Boolean(isError));
}

function paint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function setProgress(percent, message) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  progressFill.style.width = `${value}%`;
  progressPercent.textContent = `${value}%`;
  progressTrack.setAttribute("aria-valuenow", String(value));
  processBtn.textContent = `Processing ${value}%`;
  if (message) setStatus(message);
}

function waitForOpenCv() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (typeof cv !== "undefined" && cv.Mat) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 90000) {
        clearInterval(timer);
        reject(new Error("The page could not finish loading. Refresh and try again."));
      }
    }, 100);
  });
}

async function loadSession() {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = true;
  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error("The page could not finish loading. Refresh and try again.");
  }
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const percent = total ? ` ${Math.min(100, Math.round((received / total) * 100))}%` : "";
    setStatus(`Getting ready…${percent}`);
  }
  const model = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    model.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
  } catch (error) {
    ort.env.wasm.proxy = false;
    session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
  }
}

function drawSource(image) {
  originalCanvas.width = image.width;
  originalCanvas.height = image.height;
  const ctx = originalCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height);
  const rgb = new Uint8Array(image.width * image.height * 3);
  for (let i = 0, j = 0; i < pixels.data.length; i += 4, j += 3) {
    rgb[j] = pixels.data[i];
    rgb[j + 1] = pixels.data[i + 1];
    rgb[j + 2] = pixels.data[i + 2];
  }
  source = { rgb, width: image.width, height: image.height };
  originalFigure.hidden = false;
  resultFigure.hidden = true;
  resultCanvas.width = image.width;
  resultCanvas.height = image.height;
  resultCanvas.getContext("2d").clearRect(0, 0, image.width, image.height);
  downloadBtn.disabled = true;
  processBtn.disabled = !session;
}

async function setImageFromBlob(blob) {
  const image = await createImageBitmap(blob);
  drawSource(image);
  image.close();
}

function resizeAspectRatio(src) {
  const height = src.rows;
  const width = src.cols;
  let targetSize = 1.5 * Math.max(height, width);
  if (targetSize > NET_WIDTH) targetSize = NET_WIDTH;
  const ratio = targetSize / Math.max(height, width);
  const targetH = Math.trunc(height * ratio);
  const targetW = Math.trunc(width * ratio);
  const proc = new cv.Mat();
  cv.resize(src, proc, new cv.Size(targetW, targetH), 0, 0, cv.INTER_LINEAR);
  let canvasH = targetH;
  let canvasW = targetW;
  if (canvasH % 32 !== 0) canvasH += 32 - (canvasH % 32);
  if (canvasW % 32 !== 0) canvasW += 32 - (canvasW % 32);
  const padded = new cv.Mat(canvasH, canvasW, proc.type(), new cv.Scalar(0, 0, 0));
  const roi = padded.roi(new cv.Rect(0, 0, targetW, targetH));
  proc.copyTo(roi);
  roi.delete();
  proc.delete();
  return padded;
}

async function prepareInput(rgb, width, height) {
  setProgress(2, "Preparing image…");
  const src = cv.matFromArray(height, width, cv.CV_8UC3, rgb);
  const padded = resizeAspectRatio(src);
  src.delete();
  const padded32 = new cv.Mat();
  padded.convertTo(padded32, cv.CV_32FC3);
  padded.delete();
  const exact = new cv.Mat();
  cv.resize(padded32, exact, new cv.Size(NET_WIDTH, NET_HEIGHT), 0, 0, cv.INTER_LINEAR);
  padded32.delete();

  const srcData = exact.data32F;
  const plane = NET_HEIGHT * NET_WIDTH;
  const nchw = new Float32Array(3 * plane);
  for (let y = 0; y < NET_HEIGHT; y++) {
    for (let x = 0; x < NET_WIDTH; x++) {
      const pixel = (y * NET_WIDTH + x) * 3;
      const offset = y * NET_WIDTH + x;
      for (let c = 0; c < 3; c++) {
        nchw[c * plane + offset] = (srcData[pixel + c] - MEAN[c]) / VARIANCE[c];
      }
    }
    if (y % 32 === 0) {
      setProgress(2 + (y / NET_HEIGHT) * 18, "Preparing image…");
      await paint();
    }
  }
  exact.delete();
  return nchw;
}

function splitMaps(output) {
  const dims = output.dims;
  const data = output.data;
  if (dims.length === 4 && dims[3] <= 8 && dims[1] > 8) {
    const height = dims[1];
    const width = dims[2];
    const channels = dims[3];
    const text = new Float32Array(height * width);
    const link = new Float32Array(height * width);
    for (let i = 0; i < height * width; i++) {
      text[i] = data[i * channels];
      link[i] = data[i * channels + 1];
    }
    return { text, link, height, width };
  }
  if (dims.length === 4 && dims[1] <= 8) {
    const height = dims[2];
    const width = dims[3];
    const plane = height * width;
    return {
      text: data.slice(0, plane),
      link: data.slice(plane, plane * 2),
      height,
      width,
    };
  }
  throw new Error("Could not finish. Try another image.");
}

function statAt(stats, row, col) {
  if (typeof stats.intAt === "function") return stats.intAt(row, col);
  return stats.data32S[row * stats.cols + col];
}

function boxFromRotatedRect(rect) {
  const angle = rect.angle * Math.PI / 180;
  const a = Math.sin(angle) * 0.5;
  const b = Math.cos(angle) * 0.5;
  const cx = rect.center.x;
  const cy = rect.center.y;
  const p0x = cx - a * rect.size.height - b * rect.size.width;
  const p0y = cy + b * rect.size.height - a * rect.size.width;
  const p1x = cx + a * rect.size.height - b * rect.size.width;
  const p1y = cy - b * rect.size.height - a * rect.size.width;
  return [
    [p0x, p0y],
    [p1x, p1y],
    [2 * cx - p0x, 2 * cy - p0y],
    [2 * cx - p1x, 2 * cy - p1y],
  ];
}

function orderBox(box) {
  let start = 0;
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const sum = box[i][0] + box[i][1];
    if (sum < best) {
      best = sum;
      start = i;
    }
  }
  return [0, 1, 2, 3].map((i) => box[(start + i) % 4]);
}

async function getDetBoxes(text, link, height, width) {
  const count = height * width;
  const textScore = new Uint8Array(count);
  const linkScore = new Uint8Array(count);
  const combined = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const textOn = text[i] > 0.4 ? 1 : 0;
    const linkOn = link[i] > 0.4 ? 1 : 0;
    textScore[i] = textOn;
    linkScore[i] = linkOn;
    combined[i] = Math.min(textOn + linkOn, 1);
  }

  const combinedMat = cv.matFromArray(height, width, cv.CV_8UC1, combined);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  let labelCount = cv.connectedComponentsWithStats(combinedMat, labels, stats, centroids, 4);
  if (typeof labelCount !== "number") labelCount = stats.rows;
  combinedMat.delete();
  centroids.delete();

  const labelData = labels.data32S;
  const maxText = new Float32Array(labelCount).fill(-Infinity);
  for (let i = 0; i < count; i++) {
    const label = labelData[i];
    if (text[i] > maxText[label]) maxText[label] = text[i];
  }

  const boxes = [];
  for (let label = 1; label < labelCount; label++) {
    const area = statAt(stats, label, cv.CC_STAT_AREA);
    if (area < 10 || maxText[label] < 0.7) continue;

    const seg = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      if (labelData[i] === label) seg[i] = 255;
      if (linkScore[i] === 1 && textScore[i] === 0) seg[i] = 0;
    }
    const x = statAt(stats, label, cv.CC_STAT_LEFT);
    const y = statAt(stats, label, cv.CC_STAT_TOP);
    const boxW = statAt(stats, label, cv.CC_STAT_WIDTH);
    const boxH = statAt(stats, label, cv.CC_STAT_HEIGHT);
    const niter = Math.trunc(Math.sqrt(area * Math.min(boxW, boxH) / (boxW * boxH)) * 2);
    let sx = Math.max(0, x - niter);
    let sy = Math.max(0, y - niter);
    let ex = Math.min(width, x + boxW + niter + 1);
    let ey = Math.min(height, y + boxH + niter + 1);
    if (ex <= sx || ey <= sy) continue;

    const segMat = cv.matFromArray(height, width, cv.CV_8UC1, seg);
    const roi = segMat.roi(new cv.Rect(sx, sy, ex - sx, ey - sy));
    const dilated = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1 + niter, 1 + niter));
    cv.dilate(roi, dilated, kernel);
    dilated.copyTo(roi);
    kernel.delete();
    dilated.delete();
    roi.delete();

    const segData = segMat.data;
    const points = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        if (segData[py * width + px] === 0) continue;
        points.push(px, py);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    if (points.length < 6) {
      segMat.delete();
      continue;
    }
    const pointMat = cv.matFromArray(points.length / 2, 1, cv.CV_32SC2, points);
    const rotated = cv.minAreaRect(pointMat);
    pointMat.delete();
    segMat.delete();
    let box = boxFromRotatedRect(rotated);
    const edgeW = Math.hypot(box[0][0] - box[1][0], box[0][1] - box[1][1]);
    const edgeH = Math.hypot(box[1][0] - box[2][0], box[1][1] - box[2][1]);
    const boxRatio = Math.max(edgeW, edgeH) / (Math.min(edgeW, edgeH) + 1e-5);
    if (Math.abs(1 - boxRatio) <= 0.1) {
      box = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
    }
    boxes.push(orderBox(box));
    if (label % 4 === 0) {
      setProgress(75 + (label / labelCount) * 15, "Cleaning Text");
      await paint();
    }
  }

  labels.delete();
  stats.delete();
  return boxes;
}

async function renderResult(rgb, width, height, boxes, useBlur, leftOffset, rightOffset, darkMode) {
  const result = new Uint8ClampedArray(width * height * 4);
  const background = darkMode ? 0 : 255;
  for (let i = 0; i < result.length; i += 4) {
    result[i] = background;
    result[i + 1] = background;
    result[i + 2] = background;
    result[i + 3] = 255;
  }

  for (let index = 0; index < boxes.length; index++) {
    const box = boxes[index];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of box) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const x1 = Math.max(0, Math.trunc(minX) - leftOffset);
    const y1 = Math.max(0, Math.trunc(minY) - 15);
    const x2 = Math.min(width, Math.trunc(maxX) + rightOffset);
    const y2 = Math.min(height, Math.trunc(maxY) + 30);
    const cropW = x2 - x1;
    const cropH = y2 - y1;
    if (cropW <= 0 || cropH <= 0) continue;

    const crop = new Uint8Array(cropW * cropH * 3);
    for (let y = 0; y < cropH; y++) {
      const src = ((y1 + y) * width + x1) * 3;
      crop.set(rgb.subarray(src, src + cropW * 3), y * cropW * 3);
    }
    const cropMat = cv.matFromArray(cropH, cropW, cv.CV_8UC3, crop);
    const gray = new cv.Mat();
    cv.cvtColor(cropMat, gray, cv.COLOR_RGB2GRAY);
    cropMat.delete();
    const thresh = new cv.Mat();
    cv.threshold(gray, thresh, 50, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    gray.delete();
    let processed = thresh;
    if (useBlur) {
      processed = new cv.Mat();
      cv.blur(thresh, processed, new cv.Size(7, 7));
      thresh.delete();
    }
    if (darkMode) {
      const inverted = new cv.Mat();
      cv.bitwise_not(processed, inverted);
      processed.delete();
      processed = inverted;
    }
    const grayData = processed.data;
    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const value = grayData[y * cropW + x];
        const color = darkMode && value === 255 ? 224 : value;
        const dest = ((y1 + y) * width + (x1 + x)) * 4;
        result[dest] = color;
        result[dest + 1] = color;
        result[dest + 2] = color;
      }
    }
    processed.delete();
    if (index % 3 === 0) {
      const span = boxes.length || 1;
      setProgress(90 + (index / span) * 9, "Cleaning Text");
      await paint();
    }
  }

  resultCanvas.width = width;
  resultCanvas.height = height;
  const imageData = new ImageData(result, width, height);
  resultCanvas.getContext("2d").putImageData(imageData, 0, 0);
  resultFigure.hidden = false;
}

function stopDetectionClock(timer) {
  if (timer) clearInterval(timer);
}

async function processImage() {
  if (!source || !session || processBtn.classList.contains("busy")) return;
  processBtn.disabled = true;
  processBtn.classList.add("busy");
  processBtn.setAttribute("aria-busy", "true");
  downloadBtn.disabled = true;
  progressWrap.classList.add("visible");
  let detectionClock = null;
  try {
    setProgress(0, "Preparing image…");
    await paint();
    const input = await prepareInput(source.rgb, source.width, source.height);
    const inputName = session.inputNames[0];
    const tensor = new ort.Tensor("float32", input, [1, 3, NET_HEIGHT, NET_WIDTH]);
    setProgress(20, "Analysing Text");
    await paint();
    const detectionStarted = Date.now();
    detectionClock = setInterval(() => {
      const elapsed = Date.now() - detectionStarted;
      const eased = 1 - Math.exp(-elapsed / 12000);
      setProgress(20 + eased * 49, "Analysing Text");
    }, 200);
    const outputs = await session.run({ [inputName]: tensor });
    stopDetectionClock(detectionClock);
    detectionClock = null;
    const outputName = session.outputNames[0];
    const maps = splitMaps(outputs[outputName]);
    setProgress(75, "Cleaning Text");
    await paint();
    const boxes = await getDetBoxes(maps.text, maps.link, maps.height, maps.width);
    const ratioW = source.width / NET_WIDTH;
    const ratioH = source.height / NET_HEIGHT;
    const scaled = boxes.map((box) => box.map(([x, y]) => [x * ratioW * 2, y * ratioH * 2]));
    const mode = document.querySelector('input[name="mode"]:checked').value;
    setProgress(90, "Cleaning Text");
    await paint();
    await renderResult(source.rgb, source.width, source.height, scaled, mode === "normal", 80, 80, false);
    setProgress(100, "Done");
    downloadBtn.disabled = false;
  } catch (error) {
    setStatus("Could not finish. Try another image.", true);
  } finally {
    stopDetectionClock(detectionClock);
    processBtn.classList.remove("busy");
    processBtn.removeAttribute("aria-busy");
    processBtn.textContent = "Process image";
    processBtn.disabled = !session || !source;
  }
}

document.getElementById("file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await setImageFromBlob(file);
    setStatus("Image loaded.");
  } catch (error) {
    setStatus("Could not open that image.", true);
  }
});

document.getElementById("sample").addEventListener("click", async () => {
  try {
    setStatus("Loading sample page…");
    const response = await fetch(SAMPLE_URL);
    if (!response.ok) throw new Error("Could not load the sample page.");
    await setImageFromBlob(await response.blob());
    setStatus("Sample loaded.");
  } catch (error) {
    setStatus("Could not load the sample page.", true);
  }
});

processBtn.addEventListener("click", processImage);
downloadBtn.addEventListener("click", () => {
  resultCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "processed_image.jpg";
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/jpeg", 0.95);
});

Promise.all([waitForOpenCv(), loadSession()])
  .then(() => {
    setStatus("Ready. Choose an image or use the sample page.");
    if (source) processBtn.disabled = false;
  })
  .catch(() => setStatus("The page could not finish loading. Refresh and try again.", true));
