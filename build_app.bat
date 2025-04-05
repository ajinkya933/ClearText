@echo off
echo Building ClearText OCR Distribution Package...
echo.

REM Activate the Python virtual environment
call venv\Scripts\activate.bat

REM Kill any Python or Node processes that might be locking files
echo Closing any Python or Node processes that might be locking files...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
timeout /t 2 /nobreak >nul

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

REM Clear electron-builder cache
echo Clearing electron-builder cache...
if exist "%LOCALAPPDATA%\electron-builder\Cache" (
  rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
)

REM Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install

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

echo.
if %ERRORLEVEL% EQU 0 (
  echo Build completed successfully!
  echo.
  echo The portable executable can be found in the dist folder.
  
  REM Create a shortcut to the executable
  echo Creating shortcut to the executable...
  powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('ClearText OCR.lnk'); $Shortcut.TargetPath = '%CD%\dist\ClearText OCR-Portable-1.0.0.exe'; $Shortcut.Save()"
  
  echo.
  echo A shortcut has been created in the current directory.
  echo You can double-click "ClearText OCR.lnk" to start the application.
) else (
  echo Build failed. Please check the errors above.
  echo.
  echo You can try using run_dev.bat instead for development mode.
)

echo.
pause 