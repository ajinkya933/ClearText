const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Clean dist directory if it exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
}

// Run electron-builder directly
exec('npx electron-builder', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Stdout: ${stdout}`);
  console.log('Build completed! Check the dist folder for the output.');
}); 