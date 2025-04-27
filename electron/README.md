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
npm install              # Install Node.js dependencies
npm run prepare-python   # Set up Python embedded environment
npm start                # Start the application in development mode
npm run build            # Build the distributable application
```
The built application will be available in the dist folder.