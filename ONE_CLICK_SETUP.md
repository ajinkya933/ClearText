# ClearText OCR - One-Click Setup Guide

This guide will help you create a one-click executable version of ClearText OCR that can be easily shared with others who have no technical experience.

## Option 1: Easy Development Mode (Recommended First)

If you're having trouble with the build process, you can use the development mode which works reliably:

1. Run `setup_dev.bat` to set up the development environment
2. Run `run_dev.bat` whenever you want to start the application
3. Share these two files with your users if they need to run the app

## Option 2: Build a Portable Executable

If you want a single EXE file that can be run with just one click:

1. Make sure all applications are closed
2. Run `build_app.bat` to build the portable application
3. Look for the shortcut named "ClearText OCR.lnk" in the current folder
4. You can share this shortcut or the original EXE file from the dist folder

## Troubleshooting Build Issues

If you encounter the "Access is denied" error:

1. Restart your computer to make sure no processes are locking files
2. Run Command Prompt or PowerShell as Administrator
3. Navigate to your project folder
4. Run `build_app.bat` from the administrator command prompt

## What Files to Share with Others

To distribute the app to non-technical users, you can:

1. Share the portable EXE file from the dist folder
   - Path: `dist/ClearText OCR-Portable-1.0.0.exe`
   - Users just need to double-click this file to run the app

2. Alternative: Share the development version
   - Files needed: `setup_dev.bat`, `run_dev.bat`, and the entire project folder
   - Users need to run setup_dev.bat once, then run_dev.bat each time they want to use the app
   - This requires Python to be installed on their system

## Making a Desktop Shortcut

To create a desktop shortcut for easy access:

1. Right-click on `ClearText OCR.lnk` and select "Copy"
2. Right-click on your desktop and select "Paste shortcut"
3. The shortcut can now be used to start the application with a single click 