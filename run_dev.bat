@echo off
echo Starting ClearText OCR in development mode...
echo.

REM Activate the Python virtual environment
call venv\Scripts\activate.bat

REM Run the app
npm start

pause 