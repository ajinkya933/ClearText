const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('cross-spawn');

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

  // Start Streamlit server with headless mode to prevent browser opening
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  streamlitProcess = spawn(pythonPath, ['-m', 'streamlit', 'run', 'app.py', '--server.headless', 'true'], {
    stdio: 'inherit',
    shell: true
  });

  // Wait for Streamlit to start and then load the page
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:8501');
  }, 5000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (streamlitProcess) {
      streamlitProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle cleanup on exit
process.on('exit', () => {
  if (streamlitProcess) {
    streamlitProcess.kill();
  }
}); 