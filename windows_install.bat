@echo off
echo Installing ClearText OCR Application...
echo.

REM Create and activate virtual environment
python -m venv venv
call venv\Scripts\activate.bat

REM Install Python dependencies
pip install --upgrade pip
pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
pip install --no-deps craft-text-detector==0.4.3
pip install opencv-python==4.8.1.78
pip install gdown==5.2.0

echo.
echo Installation complete!
echo.
echo To run the application:
echo.
echo For Command Prompt (cmd):
echo 1. Activate the virtual environment: venv\Scripts\activate.bat
echo 2. Run the application: streamlit run app.py
echo.
echo For PowerShell:
echo 1. Activate the virtual environment: .\venv\Scripts\Activate.ps1
echo 2. Run the application: streamlit run app.py
echo.
pause 