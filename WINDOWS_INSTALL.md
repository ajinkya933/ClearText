# Windows Installation Guide for ClearText OCR

This guide will help you install and run the ClearText OCR application on Windows without using Docker.

## Prerequisites

1. Python 3.9 (Download from [python.org](https://www.python.org/downloads/))
   - During installation, make sure to check "Add Python to PATH"
2. Git (Download from [git-scm.com](https://git-scm.com/download/win))

## Installation Steps

### Method 1: Using the Installation Script (Recommended)

1. Download or clone this repository to your computer
2. Double-click on `windows_install.bat`
3. Wait for the installation to complete
4. Follow the on-screen instructions to run the application

### Method 2: Manual Installation

#### Using Command Prompt (cmd)
1. Open Command Prompt as Administrator
2. Navigate to the project directory
3. Create a virtual environment:
   ```
   python -m venv venv
   ```
4. Activate the virtual environment:
   ```
   venv\Scripts\activate.bat
   ```
5. Install the required packages:
   ```
   pip install --upgrade pip
   pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   pip install --no-deps craft-text-detector==0.4.3
   pip install opencv-python==4.8.1.78
   pip install gdown==5.2.0
   ```

#### Using PowerShell
1. Open PowerShell as Administrator
2. Navigate to the project directory
3. Create a virtual environment:
   ```
   python -m venv venv
   ```
4. Activate the virtual environment:
   ```
   .\venv\Scripts\Activate.ps1
   ```
5. Install the required packages:
   ```
   pip install --upgrade pip
   pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   pip install --no-deps craft-text-detector==0.4.3
   pip install opencv-python==4.8.1.78
   pip install gdown==5.2.0
   ```

## Running the Application

### Using Command Prompt (cmd)
1. Open Command Prompt
2. Navigate to the project directory
3. Activate the virtual environment:
   ```
   venv\Scripts\activate.bat
   ```
4. Run the application:
   ```
   streamlit run app.py
   ```

### Using PowerShell
1. Open PowerShell
2. Navigate to the project directory
3. Activate the virtual environment:
   ```
   .\venv\Scripts\Activate.ps1
   ```
4. Run the application:
   ```
   streamlit run app.py
   ```

5. The application will open in your default web browser

## Troubleshooting

1. If you encounter any errors during installation, make sure:
   - Python 3.9 is installed and added to PATH
   - You're running the commands as Administrator
   - Your internet connection is stable

2. If you get a "module not found" error:
   - Make sure you've activated the virtual environment
   - Try running `pip install -r requirements.txt` again

3. If the application doesn't start:
   - Make sure no other application is using port 8501
   - Try running `streamlit run app.py` again

4. If you get a PowerShell execution policy error:
   - Run PowerShell as Administrator
   - Execute: `Set-ExecutionPolicy RemoteSigned`
   - Type 'Y' when prompted

5. If you encounter numpy version conflicts:
   - Try installing packages in this order:
     ```
     pip install numpy
     pip install opencv-python==4.8.1.78
     pip install -r requirements.txt
     ```

## Need Help?

If you encounter any issues during installation or running the application, please create an issue on the GitHub repository or contact the maintainers. 