# ClearText OCR Desktop Application Installation Guide

This guide will help you install and run the ClearText OCR application as a desktop application using Electron.

## Prerequisites

1. Python 3.9 (Download from [python.org](https://www.python.org/downloads/))
   - During installation, make sure to check "Add Python to PATH"
2. Node.js (Download from [nodejs.org](https://nodejs.org/))
   - Choose the LTS version
3. Git (Download from [git-scm.com](https://git-scm.com/download/win))

## Installation Steps

### Method 1: Using the Installation Script (Recommended)

1. Download or clone this repository to your computer
2. Run `windows_install.bat` to install Python dependencies
3. Run `electron_install.bat` to install Electron dependencies and build the app
4. The application will be built in the `dist` folder

### Method 2: Manual Installation

1. Install Python dependencies:
   ```
   python -m venv venv
   venv\Scripts\activate.bat
   pip install --upgrade pip
   pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   pip install --no-deps craft-text-detector==0.4.3
   pip install opencv-python==4.8.1.78
   pip install gdown==5.2.0
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Build the application:
   ```
   npm run build
   ```

## Running the Application

### Development Mode
1. Activate the Python virtual environment:
   ```
   venv\Scripts\activate.bat
   ```
2. Start the application:
   ```
   npm start
   ```

### Production Mode
1. Navigate to the `dist` folder
2. Run the generated executable file

## Troubleshooting

1. If you encounter any errors during installation:
   - Make sure all prerequisites are installed
   - Check that Python and Node.js are added to PATH
   - Run the commands as Administrator

2. If the application doesn't start:
   - Make sure no other application is using port 8501
   - Check that the Python virtual environment is activated
   - Verify that all dependencies are installed correctly

3. If you get a Node.js error:
   - Make sure Node.js is installed correctly
   - Try running `npm install` again
   - Check your Node.js version (should be LTS)

## Need Help?

If you encounter any issues during installation or running the application, please create an issue on the GitHub repository or contact the maintainers. 