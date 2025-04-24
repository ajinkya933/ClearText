const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
let streamlitProcess;

// Function to copy DLLs to the Python directory
/*
function copyDllsToPython() {
  try {
    const resourcesPath = app.isPackaged ? process.resourcesPath : __dirname;
    const dllsPath = path.join(resourcesPath, 'dlls');
    const pythonPath = path.join(resourcesPath, 'python');
    
    if (fs.existsSync(dllsPath) && fs.existsSync(pythonPath)) {
      console.log('Copying DLLs to Python directory...');
      
      // Get all DLLs from the dlls directory
      const dlls = fs.readdirSync(dllsPath);
      
      // Copy each DLL to the Python directory
      dlls.forEach(dll => {
        const source = path.join(dllsPath, dll);
        const destination = path.join(pythonPath, dll);
        fs.copyFileSync(source, destination);
        console.log(`Copied ${dll} to Python directory`);
      });
      
      return true;
    } else {
      console.error('DLLs or Python directory not found');
      return false;
    }
  } catch (error) {
    console.error('Error copying DLLs:', error);
    return false;
  }
}
*/

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Show loading screen
  mainWindow.loadFile('loading.html');
  
  // Copy DLLs to Python directory
  // copyDllsToPython();
  
  // Start Streamlit
  setTimeout(() => {
    startStreamlit();
  }, 1000);
}

function startStreamlit() {
  const resourcesPath = app.isPackaged ? process.resourcesPath : __dirname;
  const pythonPath = path.join(resourcesPath, 'python', 'python.exe');
  const pythonDir = path.join(resourcesPath, 'python');
  const appPath = path.join(resourcesPath, 'app.py');
  const cv2Dir = path.join(pythonDir, 'Lib', 'site-packages', 'cv2');
  const weightsDir = path.join(resourcesPath, 'weights');

  // Verify weights directory exists
  console.log('Checking weights directory:', weightsDir);
  if (fs.existsSync(weightsDir)) {
    console.log('Weights directory found:', weightsDir);
    // Log weights files
    const weightsFiles = fs.readdirSync(weightsDir);
    console.log('Weights files:', weightsFiles);
  } else {
    console.error('Weights directory not found:', weightsDir);
  }
  
  // Verify OpenCV directory exists
  console.log('Checking OpenCV directory:', cv2Dir);
  if (fs.existsSync(cv2Dir)) {
    console.log('OpenCV directory found:', cv2Dir);
    // Log OpenCV DLLs
    const cv2Files = fs.readdirSync(cv2Dir);
    console.log('OpenCV files:', cv2Files.filter(f => f.endsWith('.dll') || f.endsWith('.pyd')));
  } else {
    console.error('OpenCV directory not found:', cv2Dir);
  }
  
  // Create a local weights directory and copy model.onnx into it
  // This ensures app.py can find it at 'weights/model.onnx'
  const localWeightsDir = path.join(process.cwd(), 'weights');
  if (!fs.existsSync(localWeightsDir)) {
    fs.mkdirSync(localWeightsDir, { recursive: true });
    console.log('Created local weights directory:', localWeightsDir);
  }
  
  // Copy model.onnx to the local weights directory
  if (fs.existsSync(weightsDir)) {
    const modelFile = path.join(weightsDir, 'model.onnx');
    if (fs.existsSync(modelFile)) {
      const localModelFile = path.join(localWeightsDir, 'model.onnx');
      fs.copyFileSync(modelFile, localModelFile);
      console.log('Copied model.onnx to local weights directory');
    } else {
      console.error('model.onnx not found in:', weightsDir);
    }
  }
  
  /*
  // Ensure our DLLs are copied where OpenCV will look for them
  // ... existing code ...
  */
  
  // Set environment variables to help Python find DLLs
  const env = {
    ...process.env,
    PYTHONHOME: pythonDir,
    PYTHONPATH: path.join(pythonDir, 'Lib', 'site-packages'),
    WEIGHTS_DIR: path.join(resourcesPath, 'weights'),  // Add weights directory path
    PATH: [
      pythonDir,                // Python directory
      path.join(pythonDir, 'Lib', 'site-packages', 'cv2'),  // cv2 directory - explicitly added
      path.join(pythonDir, 'Scripts'),   // Python Scripts directory
      process.env.PATH || ''    // Original PATH
    ].join(path.delimiter)
  };
  
  // Start Streamlit with the configured environment
  streamlitProcess = spawn(pythonPath, [
    '-m', 'streamlit',
    'run',
    appPath,
    '--server.headless', 'true',
    '--server.address', '127.0.0.1'
  ], {
    stdio: 'pipe',
    env: env
  });

  streamlitProcess.stdout.on('data', (data) => {
    console.log(`Streamlit: ${data}`);
    if (data.toString().includes('You can now view')) {
      setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:8501');
      }, 2000);
    }
  });

  streamlitProcess.stderr.on('data', (data) => {
    console.error(`Streamlit Error: ${data}`);
  });

  streamlitProcess.on('error', (error) => {
    console.error('Failed to start Streamlit process:', error);
    mainWindow.loadFile('error.html');
  });

  streamlitProcess.on('close', (code) => {
    console.log(`Streamlit process exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      mainWindow.loadFile('error.html');
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
  app.quit();
});

app.on('will-quit', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
});

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function preparePython() {
    try {
        // Create python-embedded directory
        const pythonDir = path.join(process.cwd(), 'python-embedded');
        if (!fs.existsSync(pythonDir)) {
            fs.mkdirSync(pythonDir, { recursive: true });
        }

        // 1. Download and extract Python embedded
        console.log('Downloading Python embedded...');
        const pythonVersion = '3.9.0';
        const downloadUrl = `https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-amd64.zip`;
        await downloadFile(downloadUrl, 'python.zip');

        console.log('Extracting Python...');
        execSync(`powershell -command "Expand-Archive -Path python.zip -DestinationPath ${pythonDir} -Force"`, { stdio: 'inherit' });
        fs.unlinkSync('python.zip');

        // 2. Enable pip in embedded Python
        const pythonExe = path.join(pythonDir, 'python.exe');
        console.log('Downloading get-pip.py...');
        await downloadFile('https://bootstrap.pypa.io/get-pip.py', 'get-pip.py');
        
        // Remove restrictive pth file
        const pthFile = path.join(pythonDir, `python${pythonVersion.replace(/\./g, '')}._pth`);
        if (fs.existsSync(pthFile)) {
            fs.unlinkSync(pthFile);
        }

        // Install pip
        console.log('Installing pip...');
        execSync(`"${pythonExe}" get-pip.py`, { stdio: 'inherit' });
        fs.unlinkSync('get-pip.py');

        // 3. Install dependencies
        console.log('Installing dependencies...');
        const commands = [
            // Install torch CPU version
            `"${pythonExe}" -m pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu`,
            
            // Install main requirements
            `"${pythonExe}" -m pip install --no-cache-dir -r requirements.txt`,
            
            // Install specific packages
            `"${pythonExe}" -m pip install --no-deps craft-text-detector==0.4.3`,
            `"${pythonExe}" -m pip install opencv-python==4.5.4.60`,
            `"${pythonExe}" -m pip install gdown==5.2.0`,
        ];

        for (const command of commands) {
            console.log(`Running command: ${command}`);
            execSync(command, { stdio: 'inherit' });
        }
    } catch (error) {
        console.error('Error preparing Python:', error);
    }
}