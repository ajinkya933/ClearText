# ClearText Electron App

This is an Electron wrapper for the ClearText Streamlit application.

## Prerequisites

- Node.js (v14 or higher)
- PowerShell (for Windows commands during setup)
- Internet connection (for downloading Python and dependencies)

## Project Structure

```
electron/                # Electron application directory
├── main.js              # Main Electron process
├── loading.html         # Loading screen
├── error.html           # Error screen
├── package.json         # Electron package configuration
├── test-build.js        # Build validation script
├── prepare-python.js    # Script to set up Python embedded
└── python-embedded/     # Embedded Python distribution (created during setup)
```

## Installation

1. Navigate to the electron directory:
```bash
cd electron
```

2. Run the complete setup (installs Node.js dependencies and sets up Python):
```bash
npm run setup
```

This setup process will:
- Install all required Node.js dependencies
- Download and set up an embedded Python 3.9 environment
- Install all required Python packages (including OpenCV, Streamlit, etc.)
- Copy necessary Python modules from the parent directory

## Running the App

To run the app in development mode:
```bash
npm start
```

## Building the App

To build a Windows executable:
```bash
npm run build
```

The built application will be available in the `dist` folder.

## Manual Setup Steps

If you prefer to run each step manually:

1. Install Node.js dependencies:
```bash
npm install
```

2. Set up the Python embedded environment:
```bash
npm run prepare-python
```

3. Validate the build environment:
```bash
npm run test
```

## Architecture

This application uses a Python embedded distribution approach:
- Python interpreter and all dependencies are bundled with the application
- No need to install Python separately or create a virtual environment
- The application is self-contained and will work on any Windows machine without additional setup

## Notes

- The app will automatically start the Streamlit server and open it in an Electron window
- The Streamlit server runs on port 8501
- When you close the app, it will automatically shut down the Streamlit server 