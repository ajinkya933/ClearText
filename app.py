import streamlit as st
from PIL import Image
import numpy as np
import cv2
import torch
import onnxruntime as rt
import os
from craft_utils import getDetBoxes, adjustResultCoordinates
import imgproc
import file_utils
from io import BytesIO

# Initialize ONNX session
@st.cache_resource
def load_model():
    return rt.InferenceSession("weights/model.onnx")

def process_image(img_array, use_blur=True, left_offset=0, right_offset=0, dark_mode=False):
    sess = load_model()
    input_name = sess.get_inputs()[0].name
    
    # Store original image dimensions
    original_height, original_width = img_array.shape[:2]
    
    # Calculate target dimensions
    target_width = 1280
    target_height = 960
    
    # Resize image
    img_resized, target_ratio, size_heatmap = imgproc.resize_aspect_ratio(
        img_array, 
        square_size=target_width,
        interpolation=cv2.INTER_LINEAR, 
        mag_ratio=1.5
    )
    
    # Then resize to exact dimensions
    img_resized = cv2.resize(img_resized, (target_width, target_height), interpolation=cv2.INTER_LINEAR)
    
    # Calculate actual ratios
    ratio_w = original_width / target_width
    ratio_h = original_height / target_height
    
    # Prepare image for inference
    x = imgproc.normalizeMeanVariance(img_resized)
    x = torch.from_numpy(x).permute(2, 0, 1)
    x = x.unsqueeze(0)
    
    # Run inference
    y, feature = sess.run(None, {input_name: x.numpy()})
    
    # Process results
    score_text = y[0, :, :, 0]
    score_link = y[0, :, :, 1]
    
    # Get detection boxes
    boxes, polys = getDetBoxes(score_text, score_link, 0.7, 0.4, 0.4, True)
    boxes = adjustResultCoordinates(boxes, ratio_w, ratio_h)
    
    # Create output directory if it doesn't exist
    output_dir = 'outputs/'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Save and return processed image with blur parameter
    file_utils.saveResult('outputs/', img_array[:,:,::-1], boxes, dirname=output_dir, use_blur=use_blur, 
                         total_left_offset=left_offset, total_right_offset=right_offset, dark_mode=dark_mode)
    
    # Read the processed image with error checking
    result_path = os.path.join(output_dir, 'res_out.jpg')
    if not os.path.exists(result_path):
        st.error(f"Output file not found at {result_path}")
        return None
        
    result_image = cv2.imread(result_path)
    if result_image is None:
        st.error("Failed to read the processed image")
        return None
        
    result_image = cv2.cvtColor(result_image, cv2.COLOR_BGR2RGB)
    return result_image

def single_image_demo():
    st.title("ClearText")
    
    # Add processing option selector
    processing_option = st.radio(
        "Select Processing Mode",
        ["Normal", "Sharp"],
        help="Normal mode applies blur for smoother text. Sharp mode preserves original text edges."
    )
    
    # Create expandable advanced settings section
    with st.expander("Advanced Settings"):
        st.info("Adjust text appearance and padding")
        
        # Add theme selector
        theme_mode = st.radio(
            "Output Theme",
            ["Light Mode", "Dark Mode"],
            help="Light Mode: White background with black text\nDark Mode: Dark background with light gray text"
        )
        
        st.divider()  # Add a visual separator
        
        # Padding controls with visual explanation
        st.info("Adjust padding around detected text regions")
        
        # Add padding explanation diagram
        padding_explanation = """
        ```
        ┌───────────────────────────────┐
        │                               │
        │   ◄─── Left    Right ───►     │
        │   Padding     Padding         │
        │     ┌─────────────┐           │
        │     │   Sample    │           │
        │     │    Text     │           │
        │     └─────────────┘           │
        │                               │
        └───────────────────────────────┘
        
        • Left Padding: Increase this value if words/letters are not detected on the left hand side
        • Right Padding: Increase this value if words/letters are not detected on the right hand side
        """
        st.code(padding_explanation, language=None)
        
        # Padding sliders in columns
        col1, col2 = st.columns(2)
        with col1:
            left_offset = st.slider("Left Padding", 0, 80, 0, 
                                  help="Adds extra space to the left of detected text (in pixels)")
            left_offset_manual = st.number_input("Manual Left Padding", 0, 1000, 0,
                                               help="Enter a custom value for left padding (0-1000 pixels)")
        with col2:
            right_offset = st.slider("Right Padding", 0, 80, 0, 
                                   help="Adds extra space to the right of detected text (in pixels)")
            right_offset_manual = st.number_input("Manual Right Padding", 0, 1000, 0,
                                                help="Enter a custom value for right padding (0-1000 pixels)")
        
        # Combine slider and manual values
        total_left_offset = left_offset + left_offset_manual
        total_right_offset = right_offset + right_offset_manual
        
        st.info(f"Total Left Padding: {total_left_offset}px | Total Right Padding: {total_right_offset}px")
    
    # File uploader
    uploaded_file = st.file_uploader("Choose an image...", type=['jpg', 'jpeg', 'png'])
    
    if uploaded_file is not None:
        # Display original image
        image = Image.open(uploaded_file)
        st.image(image, caption='Original Image', use_column_width=True)
        
        # Process image when user clicks button
        if st.button('Process Image'):
            with st.spinner('Processing...'):
                # Convert PIL Image to numpy array
                img_array = np.array(image)
                
                # Process the image with selected option
                use_blur = processing_option == "Normal"
                dark_mode = theme_mode == "Dark Mode"
                result_image = process_image(img_array, use_blur, total_left_offset, total_right_offset, dark_mode)
                
                # Only show result if processing was successful
                if result_image is not None:
                    # Display result
                    st.image(result_image, caption='Processed Image', use_column_width=True)
                    
                    # Add download button
                    result_pil = Image.fromarray(result_image)
                    buf = BytesIO()
                    result_pil.save(buf, format="JPEG")
                    st.download_button(
                        label="Download Processed Image",
                        data=buf.getvalue(),
                        file_name="processed_image.jpg",
                        mime="image/jpeg"
                    )

def multi_page_processing():
    st.title("Multi-page Processing")
    
    # Add processing option selector
    processing_option = st.radio(
        "Select Processing Mode",
        ["Normal", "Sharp"],
        help="Normal mode applies blur for smoother text. Sharp mode preserves original text edges.",
        key="multi_processing_option"
    )
    
    # Create expandable advanced settings section
    with st.expander("Advanced Settings"):
        st.info("Adjust text appearance and padding")
        
        # Add theme selector
        theme_mode = st.radio(
            "Output Theme",
            ["Light Mode", "Dark Mode"],
            help="Light Mode: White background with black text\nDark Mode: Dark background with light gray text",
            key="multi_theme_mode"
        )
        
        st.divider()  # Add a visual separator
        
        # Padding controls with visual explanation
        st.info("Adjust padding around detected text regions")
        
        # Padding sliders in columns
        col1, col2 = st.columns(2)
        with col1:
            left_offset = st.slider("Left Padding", 0, 80, 0, 
                                  help="Adds extra space to the left of detected text (in pixels)",
                                  key="multi_left_offset")
            left_offset_manual = st.number_input("Manual Left Padding", 0, 1000, 0,
                                               help="Enter a custom value for left padding (0-1000 pixels)",
                                               key="multi_left_offset_manual")
        with col2:
            right_offset = st.slider("Right Padding", 0, 80, 0, 
                                   help="Adds extra space to the right of detected text (in pixels)",
                                   key="multi_right_offset")
            right_offset_manual = st.number_input("Manual Right Padding", 0, 1000, 0,
                                                help="Enter a custom value for right padding (0-1000 pixels)",
                                                key="multi_right_offset_manual")
        
        # Combine slider and manual values
        total_left_offset = left_offset + left_offset_manual
        total_right_offset = right_offset + right_offset_manual
        
        st.info(f"Total Left Padding: {total_left_offset}px | Total Right Padding: {total_right_offset}px")
    
    # Multi-file uploader
    uploaded_files = st.file_uploader("Choose images...", type=['jpg', 'jpeg', 'png'], accept_multiple_files=True)
    
    if uploaded_files:
        st.write(f"Selected {len(uploaded_files)} images for processing")
        
        # Show thumbnails of selected images
        thumbnail_cols = st.columns(min(3, len(uploaded_files)))
        for i, uploaded_file in enumerate(uploaded_files[:3]):  # Show max 3 thumbnails
            with thumbnail_cols[i % 3]:
                image = Image.open(uploaded_file)
                st.image(image, caption=f'Image {i+1}', width=150)
        
        if len(uploaded_files) > 3:
            st.write(f"...and {len(uploaded_files) - 3} more images")
        
        # Process all images when user clicks button
        if st.button('Process All Images', key="process_multi"):
            use_blur = processing_option == "Normal"
            dark_mode = theme_mode == "Dark Mode"
            
            # Create a directory for batch output
            batch_output_dir = 'outputs/batch/'
            if not os.path.exists(batch_output_dir):
                os.makedirs(batch_output_dir)
            
            # Create a zip buffer to collect all processed images
            zip_buffer = BytesIO()
            import zipfile
            with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
                # Process each image with progress bar
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                for i, uploaded_file in enumerate(uploaded_files):
                    status_text.text(f"Processing image {i+1} of {len(uploaded_files)}")
                    
                    # Open and process image
                    image = Image.open(uploaded_file)
                    img_array = np.array(image)
                    
                    # Process the image
                    result_image = process_image(img_array, use_blur, total_left_offset, total_right_offset, dark_mode)
                    
                    if result_image is not None:
                        # Save to zip
                        result_pil = Image.fromarray(result_image)
                        img_buffer = BytesIO()
                        result_pil.save(img_buffer, format="JPEG")
                        
                        # Use original filename if available, otherwise use a generic name
                        original_name = uploaded_file.name if hasattr(uploaded_file, 'name') else f"image_{i+1}.jpg"
                        zip_file.writestr(f"processed_{original_name}", img_buffer.getvalue())
                    
                    # Update progress
                    progress_bar.progress((i + 1) / len(uploaded_files))
                
                # Add a README file to the zip
                zip_file.writestr("README.txt", "Processed with ClearText. Visit https://github.com/ajinkya933/ClearText for more information.")
            
            # Complete
            status_text.text("Processing complete!")
            progress_bar.progress(100)
            
            # Offer download
            st.download_button(
                label="Download All Processed Images (ZIP)",
                data=zip_buffer.getvalue(),
                file_name="processed_images.zip",
                mime="application/zip"
            )

def main():
    # Set page config
    st.set_page_config(
        page_title="ClearText",
        page_icon="📝",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Create sidebar
    with st.sidebar:
        st.title("ClearText")
        st.markdown("**Remove text from images**")
        
        # Create tabs in sidebar
        selected_mode = st.radio(
            "Select Mode",
            ["Demo", "Multi-page Processing"],
            index=0
        )
    
    # Display the selected page
    if selected_mode == "Demo":
        single_image_demo()
    else:
        multi_page_processing()

if __name__ == "__main__":
    main() 
