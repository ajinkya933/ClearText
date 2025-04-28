# ClearText

## What is ClearText? 🤔
ClearText is an AI-powered text detection and enhancement tool that helps make text in images more readable and clearer. Perfect for improving the legibility of text in scanned documents, photos, and other images.

# Product Demo
<div align="center">
  <a href="https://www.youtube.com/watch?v=6j5wLnsx0f0">
    <img src="https://img.youtube.com/vi/6j5wLnsx0f0/0.jpg" alt="ClearText Demo" width="600">
    <br>
    <img src="https://img.shields.io/badge/Watch-Demo-red?style=for-the-badge&logo=youtube" alt="Watch Demo">
  </a>
</div>

## 💎 Support ClearText
If you find this tool useful, consider [becoming a sponsor](https://github.com/sponsors/ajinkya933) for $1/month and get priority support!


## Perfect For 🎯
- 📄 Document Digitization
- 📚 Book Scanning
- 📱 Mobile Photos of Text
- 🖨️ Improving Scanned Documents
- 📑 Text Enhancement in Images

# Setup Demo
[![ClearText Demo](https://img.youtube.com/vi/hS363wB1pmU/0.jpg)](https://www.youtube.com/watch?v=hS363wB1pmU)



## ⚠️ Important Requirements

### Image Dimensions
- 🖼️ Minimum required dimensions:
  ```
  Width:  1280 pixels
  Height: 960 pixels
  ```
- ❌ Images smaller than these dimensions may produce poor results
- ✅ Larger images will be automatically resized while maintaining aspect ratio
- 💡 For best results, use high-resolution images (2000x1500 or larger)

# Setup

## Prerequisites 📋
- Docker 🐳
- High-resolution text images 🖼️

## Directory Structure 📁
```

├── data/ # Add your high-res images here
├── onnx/ # ONNX model will be exported here
├── weights/ # model.onnx model goes here
├── outputs/ # Detection results will be saved here
├── Dockerfile
```

## Quick Start 🏃‍♂️

1. **Add Images and download pth file** 📸
   - Place your high-resolution text images in the `data` directory
   - Download pytorch model from [here](https://drive.google.com/file/d/12L_st5Z4-GDv5GNn-FZfVs9eKJ5ipGMY/view?usp=sharing), and save it in `weights` folder 

2. **Build Docker Image** 🔨
   ```bash
   docker build -t text-clear:latest .
   ````
3. **Run Docker Container** 🐳
   ```bash
   docker run -p 8501:8501 text-clear:latest
   ```
4. This runs the streamlit app on port 8501. Open your browser and go to http://localhost:8501 to use the app.
## 📸 Demo


Here's an example of what ClearText can do:

<table>
  <tr>
    <td><b>Input Image</b></td>
    <td><b>Output Image</b></td>
  </tr>
  <tr>
    <td><img src="data/boston_cooking_a.jpg" alt="Input Image" width="400"/></td>
    <td><img src="outputs/res_out.jpg" alt="Output Image" width="400"/></td>
    IMG_0274.JPG
  </tr>
  <tr>
    <td><img src="data/IMG_0274.JPG" alt="Input Image" width="400"/></td>
    <td><img src="outputs/processed_image.jpg" alt="Output Image" width="400"/></td>
    IMG_0274.JPG
  </tr>

</table>



# 📋 Usage


<img src="imgs/streamlit1.png" alt="Input Image" width="400"/>
<img src="imgs/streamlit2.png" alt="Input Image" width="400"/>

1. Open the web interface
2. Select processing mode (Normal/Sharp)
3. Upload an image
4. Click "Process Image"
5. Download the processed result


## 💎 Sponsor $1 per month
👉 [My GitHub Sponsors link](https://github.com/sponsors/ajinkya933)


### 🌟 Sponsor Benefits
- 🛠️ Direct assistance with project-related issues and customizations
- 💡 Technical consultation for your specific use cases
- 🚀 Early access to new features and improvements
- ⭐ Recognition in our sponsors list

### Why Sponsor?
Your sponsorship helps maintain and improve ClearText, ensuring it remains a robust and reliable tool for the community. Every contribution, no matter how small, makes a difference!


## 📜 Licensing
This project uses a dual licensing model:

### Original CRAFT Components
- Licensed under MIT License (see CRAFT_LICENSE file)
- Covers the text detection functionality

### ClearText Additional Features
- Licensed under ClearText License (see CLEARTEXT_LICENSE file)
- Covers all enhancements and additional features
- Available under two options:

#### Free License
- Non-commercial use only
- Personal projects
- Academic research

#### Commercial License
For business/commercial use of ClearText's enhanced features:
- Production-ready ONNX implementation
- Custom image enhancement
- Docker deployment
- Enterprise support

👉 [Contact for Commercial Licensing](mailto:ajinkyabobade93@gmail.com)

