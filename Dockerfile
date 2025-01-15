# Use Python 3.9 slim image
FROM python:3.9

RUN pip install --upgrade pip

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install torch and torchvision first (which will bring in opencv)
# RUN pip install numpy>=1.24.0 
RUN pip install torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu


# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt


# Install craft-text-detector separately with --no-deps
RUN pip install --no-deps craft-text-detector==0.4.3
RUN pip install opencv-python==4.5.4.60
RUN pip install gdown==5.2.0
EXPOSE 8501
CMD ["streamlit", "run", "app.py"]
