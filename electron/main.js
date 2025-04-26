const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let streamlitProcess;

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
  
  // Start Streamlit
  setTimeout(() => {
    startStreamlit();
  }, 1000);
}

function startStreamlit() {
  // Log app paths for debugging
  console.log('=== App Paths ===');
  console.log('App is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('Process resources path:', process.resourcesPath);
  
  // In packaged mode, all resources are in process.resourcesPath
  // In development mode, resources are in parent directory or python-embedded
  const resourcesPath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const pythonPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'python', 'python.exe') 
    : path.join(__dirname, 'python-embedded', 'python.exe');
  const pythonDir = app.isPackaged 
    ? path.join(process.resourcesPath, 'python') 
    : path.join(__dirname, 'python-embedded');
  const appPath = path.join(resourcesPath, 'app.py');
  const cv2Dir = path.join(pythonDir, 'Lib', 'site-packages', 'cv2');
  const weightsDir = path.join(resourcesPath, 'weights');
  
  // Log important paths
  console.log('Python executable path:', pythonPath);
  console.log('Python directory:', pythonDir);
  console.log('App script path:', appPath);
  console.log('Weights directory:', weightsDir);
  
  // Check if critical files exist
  console.log('\nChecking critical files:');
  const criticalFiles = [
    { path: pythonPath, name: 'Python executable' },
    { path: appPath, name: 'App script' },
    { path: path.join(weightsDir, 'model.onnx'), name: 'Model weights' }
  ];
  
  let missingFiles = false;
  criticalFiles.forEach(file => {
    const exists = fs.existsSync(file.path);
    console.log(`${file.name} exists:`, exists);
    if (!exists) {
      console.error(`MISSING: ${file.name} at ${file.path}`);
      missingFiles = true;
    }
  });
  
  if (missingFiles) {
    console.error('Critical files are missing. Cannot start application.');
    mainWindow.loadFile('error.html');
    return;
  }

  // Verify weights directory exists
  console.log('Checking weights directory:', weightsDir);
  if (fs.existsSync(weightsDir)) {
    console.log('Weights directory found:', weightsDir);
    // Log weights files
    const weightsFiles = fs.readdirSync(weightsDir);
    console.log('Weights files:', weightsFiles);
  } else {
    console.error('Weights directory not found:', weightsDir);
    mainWindow.loadFile('error.html');
    return;
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
    mainWindow.loadFile('error.html');
    return;
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
      mainWindow.loadFile('error.html');
      return;
    }
  }
  
  // Add modules directory to PYTHONPATH so app can find them
  // In packaged mode, modules should be in resources path
  const modulesDir = resourcesPath;
  
  // Set environment variables to help Python find DLLs and modules
  const env = {
    ...process.env,
    PYTHONHOME: pythonDir,
    PYTHONPATH: [
      path.join(pythonDir, 'Lib', 'site-packages'),
      modulesDir  // Add the modules directory to find our Python files
    ].join(path.delimiter),
    WEIGHTS_DIR: weightsDir,  // Add weights directory path
    PATH: [
      pythonDir,                // Python directory
      path.join(pythonDir, 'Lib', 'site-packages', 'cv2'),  // cv2 directory
      path.join(pythonDir, 'Scripts'),   // Python Scripts directory
      process.env.PATH || ''    // Original PATH
    ].join(path.delimiter)
  };
  
  // Log the environment variables
  console.log('\nEnvironment variables:');
  console.log('PYTHONHOME:', env.PYTHONHOME);
  console.log('PYTHONPATH:', env.PYTHONPATH);
  console.log('WEIGHTS_DIR:', env.WEIGHTS_DIR);
  
  // Log the command we're about to run
  const streamlitArgs = [
    '-m', 'streamlit',
    'run',
    appPath,
    '--server.headless', 'true',
    '--server.address', '127.0.0.1'
  ];
  
  console.log('\nRunning command:', pythonPath, streamlitArgs.join(' '));
  
  // Start Streamlit with the configured environment
  streamlitProcess = spawn(pythonPath, streamlitArgs, {
    stdio: 'pipe',
    env: env
  });

  streamlitProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`Streamlit: ${output}`);
    if (output.includes('You can now view')) {
      console.log('Streamlit server started successfully, loading URL...');
      setTimeout(() => {
        console.log('Loading URL: http://127.0.0.1:8501');
        mainWindow.loadURL('http://127.0.0.1:8501');
      }, 3000);  // Give it more time to fully initialize
    }
  });

  streamlitProcess.stderr.on('data', (data) => {
    console.error(`Streamlit Error: ${data.toString()}`);
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