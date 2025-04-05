@echo off
echo Setting up ClearText OCR development environment...
echo.

REM Check if node_modules exists and delete it if it does
if exist node_modules (
  echo Removing existing node_modules...
  rmdir /s /q node_modules
)

REM Check if package-lock.json exists and delete it if it does
if exist package-lock.json (
  echo Removing existing package-lock.json...
  del package-lock.json
)

REM Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install

echo.
echo Development setup complete!
echo.
echo To run the application:
echo 1. Run: run_dev.bat
echo.
pause 