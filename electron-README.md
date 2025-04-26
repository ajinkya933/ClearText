# ClearText Electron App

This is an Electron wrapper for the ClearText Streamlit application.

## Prerequisites

- Node.js (v14 or higher)
- Python embedded distribution (included in the app)
- All Python dependencies are bundled with the application

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

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

## Architecture

This application uses a Python embedded distribution approach:
- Python interpreter and all dependencies are bundled with the application
- No need to install Python separately or create a virtual environment
- The application is self-contained and will work on any Windows machine without additional setup

## Notes

- The app will automatically start the Streamlit server and open it in an Electron window
- The Streamlit server runs on port 8501
- When you close the app, it will automatically shut down the Streamlit server 