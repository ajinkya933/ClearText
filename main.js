const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let streamlitProcess;
let startupTimeout;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false, // Don't show the window until Streamlit is ready
    title: 'ClearText OCR'
  });

  // Loading screen - check if file exists
  const loadingPath = path.join(__dirname, 'loading.html');
  if (!fs.existsSync(loadingPath)) {
    console.error(`Loading screen not found at: ${loadingPath}`);
    createLoadingFile();
  }

  // Error screen - check if file exists
  const errorPath = path.join(__dirname, 'error.html');
  if (!fs.existsSync(errorPath)) {
    console.error(`Error screen not found at: ${errorPath}`);
    createErrorFile();
  }

  // Load the loading screen
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  
  // Start the Streamlit server with delay to allow UI to render
  setTimeout(() => {
    startStreamlitServer();
  }, 500);
  
  // Check if Streamlit is ready
  checkStreamlitReady();
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    clearTimeout(startupTimeout);
    if (streamlitProcess) {
      streamlitProcess.kill();
    }
  });
}

function createLoadingFile() {
  const loadingContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Loading ClearText OCR</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            flex-direction: column;
        }
        .container {
            text-align: center;
            padding: 20px;
            border-radius: 5px;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 80%;
        }
        h1 {
            color: #2e6fdf;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
        }
        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid #2e6fdf;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 2s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ClearText OCR</h1>
        <p>Starting up the application... This may take a minute.</p>
        <div class="loader"></div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'loading.html'), loadingContent);
}

function createErrorFile() {
  const errorContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Error - ClearText OCR</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            flex-direction: column;
        }
        .container {
            text-align: center;
            padding: 20px;
            border-radius: 5px;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-width: 80%;
        }
        h1 {
            color: #e74c3c;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
        }
        .error-icon {
            font-size: 50px;
            color: #e74c3c;
            margin-bottom: 20px;
        }
        .error-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Unable to Start ClearText OCR</h1>
        <p>The application could not be started. This could be due to missing files or configuration issues.</p>
        
        <div class="error-details">
            <p><strong>Possible solutions:</strong></p>
            <ul>
                <li>Make sure Python is installed and in your PATH</li>
                <li>Ensure that the app.py file exists</li>
                <li>Check that all dependencies are installed</li>
                <li>Restart the application</li>
                <li>Try reinstalling the application</li>
            </ul>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'error.html'), errorContent);
}

function startStreamlitServer() {
  const resourcesPath = process.resourcesPath;
  const isPackaged = app.isPackaged;

  console.log(`Is app packaged: ${isPackaged}`);
  console.log(`Resources path: ${resourcesPath || 'not available'}`);
  console.log(`Current directory: ${__dirname}`);

  // Get the path to the Python executable
  let pythonPath;
  if (isPackaged) {
    pythonPath = path.join(resourcesPath, 'venv', 'Scripts', 'python.exe');
  } else {
    pythonPath = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  }

  // Get the path to app.py and setup.py
  let appPath, setupPath;
  if (isPackaged) {
    appPath = path.join(resourcesPath, 'app.py');
    setupPath = path.join(resourcesPath, 'setup.py');
  } else {
    appPath = path.join(__dirname, 'app.py');
    setupPath = path.join(__dirname, 'setup.py');
  }

  // Ensure Python executable exists
  if (!fs.existsSync(pythonPath)) {
    console.error(`Python executable not found at: ${pythonPath}`);
    
    // Try using the system Python as a fallback
    pythonPath = 'python';
    console.log(`Falling back to system Python: ${pythonPath}`);
  }

  // Ensure app.py exists
  if (!fs.existsSync(appPath)) {
    console.error(`app.py not found at: ${appPath}`);
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.show();
    return;
  }

  // Ensure setup.py exists
  if (!fs.existsSync(setupPath)) {
    console.error(`setup.py not found at: ${setupPath}`);
    
    // Create setup.py if it doesn't exist
    createSetupPy(setupPath);
  }

  console.log(`Starting setup with Python: ${pythonPath}`);
  console.log(`Setup path: ${setupPath}`);

  // Run the setup script first
  const setupProcess = spawn(pythonPath, [setupPath], {
    stdio: 'pipe'
  });

  setupProcess.stdout.on('data', (data) => {
    console.log(`Setup output: ${data.toString()}`);
  });

  setupProcess.stderr.on('data', (data) => {
    console.error(`Setup error: ${data.toString()}`);
  });

  setupProcess.on('close', (code) => {
    console.log(`Setup process exited with code ${code}`);
    
    // Now start the Streamlit app
    console.log(`Starting Streamlit with Python: ${pythonPath}`);
    console.log(`App path: ${appPath}`);
    
    startStreamlitApp(pythonPath, appPath);
  });
}

function createSetupPy(setupPath) {
  const setupContent = `import sys
import subprocess
import os
import site
import importlib.util

print("Running ClearText OCR setup script...")

# List of required packages to check
required_packages = [
    'torch',
    'torchvision',
    'scikit-image',
    'scipy',
    'onnx',
    'onnxruntime',
    'streamlit',
    'opencv-python',
    'gdown',
    'craft-text-detector',
    'numpy',
    'Pillow',
    'matplotlib'
]

# Check if packages are installed
print("Checking required packages...")
for package in required_packages:
    try:
        importlib.import_module(package.replace('-', '_'))
        print(f"✓ {package} is installed")
    except ImportError:
        print(f"✗ {package} is not installed")

# Get site-packages directory
site_packages = site.getsitepackages()[0]
print(f"Site packages directory: {site_packages}")

# Create craft_utils.py
print("Creating craft_utils.py...")
craft_utils_content = """
import math
import cv2
import numpy as np


def generate_words(char_bboxes, char_scores, decoder):
    '''
    Generate words bounding boxes with scores.
    Implements character-level bounding box merging to obtain word bounding boxes. 
    '''
    words = []
    char_bboxes = np.array(char_bboxes, np.int32)
    char_scores = np.array(char_scores, np.float32)

    word = []
    word_score = []
    for i, [char_bbox, score] in enumerate(zip(char_bboxes, char_scores)):
        try:
            char = decoder(char_bbox)
        except:
            print("CRAFT: Error when decoding character!")
            continue
        if char == "":
            if len(word) > 0:
                if len(word) == 1:
                    word_bbox = word[0]
                else:
                    word_bbox = merge_bboxes(np.array(word, np.int32))

                words.append([word_bbox, np.mean(np.array(word_score))])

                word = []
                word_score = []
        else:
            word.append(char_bbox)
            word_score.append(score)

    if len(word) > 0:
        if len(word) == 1:
            word_bbox = word[0]
        else:
            word_bbox = merge_bboxes(np.array(word, np.int32))

        words.append([word_bbox, np.mean(np.array(word_score))])

    return words


def merge_bboxes(bboxes):
    """
    Merge multiple bounding boxes into one.
    """
    xmin = np.min(bboxes[:, 0::2])
    ymin = np.min(bboxes[:, 1::2])
    xmax = np.max(bboxes[:, 0::2])
    ymax = np.max(bboxes[:, 1::2])

    return [xmin, ymin, xmax, ymin, xmax, ymax, xmin, ymax]


def get_rotated_box(points):
    """
    Creates rotated box.
    Returns the minimum area rectangle containing the input points.
    """
    rect = cv2.minAreaRect(points)
    box = cv2.boxPoints(rect)
    box = np.int0(box)

    return box


def poly_to_box(poly):
    """
    Convert polygon representation to bounding box.
    """
    return [np.min(poly[:, 0]), np.min(poly[:, 1]), 
            np.max(poly[:, 0]), np.max(poly[:, 1])]


def adjust_result_coordinates(polys, ratio_w, ratio_h, ratio_net=2):
    """
    Adjusts predicted coordinates according to ratio.
    """
    if len(polys) > 0:
        polys = np.array(polys)
        for k in range(len(polys)):
            if polys[k] is not None:
                polys[k] *= (ratio_w * ratio_net, ratio_h * ratio_net)
    return polys


def sort_detection(dt_boxes, image_height):
    """
    Sort detection results from top to bottom and left to right.
    """
    if len(dt_boxes) == 0:
        return dt_boxes

    def y_axis_sort(box):
        return box[0][1]

    dt_boxes = sorted(dt_boxes, key=y_axis_sort)
    
    threshold = 0.1 * image_height
    
    groups = []
    group = [dt_boxes[0]]
    
    for box in dt_boxes[1:]:
        last_box = group[-1]
        if box[0][1] - last_box[0][1] < threshold:
            group.append(box)
        else:
            groups.append(group)
            group = [box]
    
    if len(group) > 0:
        groups.append(group)
    
    result = []
    for g in groups:
        # Sort from left to right for each group
        sorted_g = sorted(g, key=lambda box: box[0][0])
        result.extend(sorted_g)
    
    return result
"""

# Create imgproc.py
print("Creating imgproc.py...")
imgproc_content = """
import cv2
import numpy as np


def resize_aspect_ratio(img, square_size, interpolation, mag_ratio=1):
    height, width, channel = img.shape

    # magnify image size
    target_size = mag_ratio * max(height, width)

    # set original image size
    if target_size > square_size:
        target_size = square_size

    ratio = target_size / max(height, width)

    target_h, target_w = int(height * ratio), int(width * ratio)
    proc = cv2.resize(img, (target_w, target_h), interpolation=interpolation)

    # make canvas and paste image
    target_h32, target_w32 = target_h, target_w
    if target_h % 32 != 0:
        target_h32 = target_h + (32 - target_h % 32)
    if target_w % 32 != 0:
        target_w32 = target_w + (32 - target_w % 32)
    resized = np.zeros((target_h32, target_w32, channel), dtype=np.float32)
    resized[0:target_h, 0:target_w, :] = proc
    target_h, target_w = target_h32, target_w32

    size_heatmap = (int(target_w / 2), int(target_h / 2))

    return resized, ratio, size_heatmap


def normalizeMeanVariance(in_img, mean=(0.485, 0.456, 0.406), variance=(0.229, 0.224, 0.225)):
    # should be RGB order
    img = in_img.copy().astype(np.float32)

    img -= np.array([mean[0] * 255.0, mean[1] * 255.0, mean[2] * 255.0], dtype=np.float32)
    img /= np.array([variance[0] * 255.0, variance[1] * 255.0, variance[2] * 255.0], dtype=np.float32)
    return img


def denormalizeMeanVariance(in_img, mean=(0.485, 0.456, 0.406), variance=(0.229, 0.224, 0.225)):
    # should be RGB order
    img = in_img.copy()
    img *= variance
    img += mean
    img *= 255.0
    img = np.clip(img, 0, 255).astype(np.uint8)
    return img
"""

# Create file_utils.py
print("Creating file_utils.py...")
file_utils_content = """
import os
import numpy as np
import cv2
from PIL import Image
import io


def read_image(img_path):
    try:
        if os.path.isfile(img_path):
            img = cv2.imread(img_path)
            # Convert from BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            return img
        else:
            return None
    except Exception as e:
        print(f"Error reading image: {e}")
        return None


def save_result(img_path, img, boxes, dirname='./result/', verticals=None, texts=None):
    try:
        img = np.array(img)

        # make result file list
        filename, file_ext = os.path.splitext(os.path.basename(img_path))

        # create output directory
        os.makedirs(dirname, exist_ok=True)
        
        # Save to directory
        result_file = os.path.join(dirname, f"{filename}_result{file_ext}")
        img_with_boxes = np.copy(img)

        # Draw boxes
        for i, box in enumerate(boxes):
            poly = np.array(box).astype(np.int32).reshape((-1))
            poly = poly.reshape(-1, 2)
            cv2.polylines(img_with_boxes, [poly.reshape((-1, 1, 2))], True, color=(0, 0, 255), thickness=2)

        # Convert from RGB to BGR for OpenCV
        img_with_boxes = cv2.cvtColor(img_with_boxes, cv2.COLOR_RGB2BGR)
        cv2.imwrite(result_file, img_with_boxes)

        return result_file
    except Exception as e:
        print(f"Error saving result: {e}")
        return None
"""

# Write the files to the site-packages directory
files_to_create = {
    'craft_utils.py': craft_utils_content,
    'imgproc.py': imgproc_content,
    'file_utils.py': file_utils_content
}

for filename, content in files_to_create.items():
    file_path = os.path.join(site_packages, filename)
    try:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Created {file_path}")
    except Exception as e:
        print(f"Error creating {filename}: {e}")
        # Try writing to current directory as fallback
        with open(filename, 'w') as f:
            f.write(content)
        print(f"Created {filename} in current directory instead")

# Test if craft_utils can be imported now
try:
    import craft_utils
    print("✓ Successfully imported craft_utils")
except ImportError as e:
    print(f"✗ Failed to import craft_utils: {e}")
    print("Creating craft_utils in current directory")
    # Add current directory to path
    sys.path.append(os.getcwd())
    try:
        import craft_utils
        print("✓ Successfully imported craft_utils after adding current directory to path")
    except ImportError as e:
        print(f"✗ Still failed to import craft_utils: {e}")

print("Setup complete!")`;

  fs.writeFileSync(setupPath, setupContent);
  console.log(`Created setup.py at: ${setupPath}`);
}

function startStreamlitApp(pythonPath, appPath) {
  // Start the Streamlit server
  streamlitProcess = spawn(pythonPath, ['-m', 'streamlit', 'run', appPath, '--server.headless', 'true', '--server.port', '8501'], {
    stdio: 'pipe'
  });

  streamlitProcess.stdout.on('data', (data) => {
    console.log(`Streamlit output: ${data.toString()}`);
  });

  streamlitProcess.stderr.on('data', (data) => {
    console.error(`Streamlit error: ${data.toString()}`);
  });

  streamlitProcess.on('error', (err) => {
    console.error('Failed to start Streamlit server:', err);
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.show();
  });

  streamlitProcess.on('close', (code) => {
    console.log(`Streamlit process exited with code ${code}`);
    if (mainWindow) {
      mainWindow.close();
    }
  });
}

function checkStreamlitReady() {
  const checkUrl = 'http://localhost:8501';
  const http = require('http');
  
  const checkInterval = 500; // Check every 500ms
  const maxStartupTime = 60000; // Maximum startup time (60 seconds)
  let elapsedTime = 0;
  
  const checkServer = () => {
    http.get(checkUrl, (response) => {
      if (response.statusCode === 200) {
        console.log('Streamlit server is ready');
        mainWindow.loadURL(checkUrl);
        mainWindow.show();
      } else {
        scheduleNextCheck();
      }
    }).on('error', (err) => {
      console.log('Waiting for Streamlit server to start...');
      scheduleNextCheck();
    });
  };
  
  const scheduleNextCheck = () => {
    elapsedTime += checkInterval;
    if (elapsedTime > maxStartupTime) {
      console.error('Streamlit server failed to start within the timeout period');
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
      mainWindow.show();
      return;
    }
    startupTimeout = setTimeout(checkServer, checkInterval);
  };
  
  checkServer();
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up when the app is quitting
app.on('before-quit', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
}); 