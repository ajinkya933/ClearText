# ClearText Electron App

This is an Electron wrapper for the ClearText Streamlit application.

## Prerequisites

- Node.js (v14 or higher)
- Python 3.9
- All Python dependencies from requirements.txt

## Installation

1. Install Node.js dependencies:
```bash
npm install
```
2. Create venv (windows powershell)
```
python -m venv venv
.\venv\Scripts\activate
```

3. Make sure all Python dependencies are installed in venv:
```bash
python.exe -m pip install --upgrade pip
pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
pip install --no-cache-dir -r requirements.txt
pip install --no-deps craft-text-detector==0.4.3
pip install gdown==5.2.0
pip install opencv-python==4.11.0.86
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

## Notes

- The app will automatically start the Streamlit server and open it in an Electron window
- The Streamlit server runs on port 8501
- When you close the app, it will automatically shut down the Streamlit server 