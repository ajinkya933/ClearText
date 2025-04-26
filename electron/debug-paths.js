const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Wait for app to be ready
app.whenReady().then(() => {
  console.log('App is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('Process resources path:', process.resourcesPath);
  
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    
    console.log('\nChecking critical files:');
    const filesToCheck = [
      path.join(resourcesPath, 'app.py'),
      path.join(resourcesPath, 'python', 'python.exe'),
      path.join(resourcesPath, 'weights', 'model.onnx')
    ];
    
    filesToCheck.forEach(file => {
      console.log(`${file} exists: ${fs.existsSync(file)}`);
    });
    
    // List resource directory contents
    console.log('\nResource directory contents:');
    try {
      const files = fs.readdirSync(resourcesPath);
      files.forEach(file => {
        console.log(` - ${file}`);
      });
    } catch (err) {
      console.error('Error listing directory:', err);
    }
  }
  
  // Exit the app
  setTimeout(() => app.quit(), 1000);
});
