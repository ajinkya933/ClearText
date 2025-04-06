@echo off
color 0A
title ClearText OCR Setup

echo ================================================
echo      ClearText OCR - All-in-One Setup
echo ================================================
echo.
echo This script will help you set up, build, or run 
echo the ClearText OCR application.
echo.
echo Options:
echo 1. Complete Setup (Install all dependencies)
echo 2. Run Application in Development Mode
echo 3. Build Portable Executable (one-click EXE)
echo 4. Exit
echo.
choice /C 1234 /N /M "Enter your choice (1-4): "

if errorlevel 4 goto :eof
if errorlevel 3 goto build
if errorlevel 2 goto run
if errorlevel 1 goto setup

:setup
cls
echo ================================================
echo      Installing Python Dependencies
echo ================================================
echo.
echo This may take several minutes...
echo.
call windows_install.bat

cls
echo ================================================
echo      Installing Electron Dependencies
echo ================================================
echo.
echo This may take several minutes...
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

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo First npm install attempt failed, retrying with alternative method...
  echo.
  timeout /t 2 /nobreak >nul
  
  REM Try with --no-optional flag to skip optional dependencies
  call npm install --no-optional
  
  if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ================================================
    echo      ERROR: npm install failed
    echo ================================================
    echo.
    echo Suggestions to fix this issue:
    echo 1. Make sure you have a stable internet connection
    echo 2. Try running this script as Administrator
    echo 3. Manually run: npm cache clean --force
    echo    Then run this script again
    echo.
    echo Press any key to continue anyway (not recommended)...
    pause >nul
  ) else (
    echo npm install completed successfully with alternative method.
  )
) else (
  echo npm install completed successfully.
)

echo.
echo ================================================
echo      Setup Complete!
echo ================================================
echo.
echo What would you like to do next?
echo 1. Run the application
echo 2. Build portable executable
echo 3. Exit
echo.
choice /C 123 /N /M "Enter your choice (1-3): "

if errorlevel 3 goto :eof
if errorlevel 2 goto build
if errorlevel 1 goto run

:run
cls
echo ================================================
echo      Starting ClearText OCR
echo ================================================
echo.
echo The application is starting...
echo.
echo Note: To close the application, close the
echo application window or press Ctrl+C in this
echo console.
echo.

REM Activate the Python virtual environment
call venv\Scripts\activate.bat

REM Run the app
call npm start

goto end

:build
cls
echo ================================================
echo      Building Portable Executable
echo ================================================
echo.
echo This process will create a standalone executable
echo that can be shared with others.
echo.
echo Building the application may take several minutes...
echo.

REM Kill any Python or Node processes that might be locking files
echo Closing any Python or Node processes that might be locking files...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
timeout /t 2 /nobreak >nul

REM Activate the Python virtual environment
call venv\Scripts\activate.bat

REM Check if dist exists and delete it if it does
if exist dist (
  echo Removing existing dist folder...
  echo This may take a moment...
  rmdir /s /q dist 2>nul
  
  REM If rmdir failed, try a more aggressive approach
  if exist dist (
    echo First attempt failed, trying a more aggressive approach...
    powershell -Command "Get-ChildItem -Path dist -Recurse | Where-Object {!$_.PSIsContainer} | ForEach-Object {$_.IsReadOnly=$false; $_.Delete()}"
    rmdir /s /q dist 2>nul
  )
)

REM Create assets folder if it doesn't exist
if not exist assets (
  echo Creating assets folder...
  mkdir assets
)

REM Run the build with electron-builder and portable target
echo.
echo Building the application...
echo.
call npm run build-portable

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ================================================
  echo      Build Successful!
  echo ================================================
  echo.
  echo The portable executable has been created at:
  echo dist\ClearText OCR-Portable-1.0.0.exe
  echo.
  echo Creating shortcut on desktop...
  
  REM Create a shortcut to the executable on desktop
  powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\ClearText OCR.lnk'); $Shortcut.TargetPath = '%CD%\dist\ClearText OCR-Portable-1.0.0.exe'; $Shortcut.Save()"
  
  echo.
  echo A shortcut has been created on your desktop.
  echo You can double-click it to start the application.
) else (
  echo.
  echo ================================================
  echo      Build Failed
  echo ================================================
  echo.
  echo The build process encountered an error.
  echo Try running the application in development mode
  echo instead (option 2 from the main menu).
)

:end
echo.
echo Press any key to return to the main menu...
pause >nul
cls
goto :eof 