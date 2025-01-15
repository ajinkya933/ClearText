from datetime import datetime
start = datetime.now()

from craft_text_detector import export_detected_regions
import torch
#torch.set_num_threads(3)
import cv2
import onnxruntime as rt
import os
import craft_utils
import imgproc
import numpy as np

#refine_net = load_refinenet_model(cuda=False)

#sess = rt.InferenceSession("model_640_480.onnx") #resize to 320x240 - bad results
sess = rt.InferenceSession("onnx/craft-bills.onnx") #1000x960 resize to 512x384
input_name = sess.get_inputs()[0].name

output_dir = 'outputs/'

img = cv2.imread('data/boston_cooking_a.jpg')
#img=imgproc.loadImage('frame1.jpg')
print(img.shape) #(1944, 2592, 3)

# Store original image dimensions
original_height, original_width = img.shape[:2]
print(f"Original dimensions: {original_width}x{original_height}")

# Calculate target dimensions
target_width = 1280
target_height = 960

# First resize using the original function
img_resized, target_ratio, size_heatmap = imgproc.resize_aspect_ratio(
    img, 
    square_size=target_width,
    interpolation=cv2.INTER_LINEAR, 
    mag_ratio=1.5
)

# Then resize to exact dimensions
img_resized = cv2.resize(img_resized, (target_width, target_height), interpolation=cv2.INTER_LINEAR)

# Calculate actual ratios based on final dimensions
ratio_w = original_width / target_width
ratio_h = original_height / target_height

print(f"Resize ratios - width: {ratio_w}, height: {ratio_h}")

x = imgproc.normalizeMeanVariance(img_resized)
x = torch.from_numpy(x).permute(2, 0, 1)    # [h, w, c] to [c, h, w]
x = x.unsqueeze(0)                # [c, h, w] to [b, c, h, w]

# Optional: verify tensor shape before inference
print(f"Input tensor shape: {x.shape}")  # Should print [1, 3, 960, 1280]

y, feature = sess.run(None, {input_name: x.numpy()})

# make score and link map
score_text = y[0, :, :, 0]
score_link = y[0, :, :, 1]

# refine link
#with torch.no_grad():
#    y_refiner = refine_net(y, feature)
#score_link = y_refiner[0,:,:,0].cpu().data.numpy()

boxes, polys = craft_utils.getDetBoxes(score_text, score_link, 0.7, 0.4, 0.4, True)
boxes = craft_utils.adjustResultCoordinates(boxes, ratio_w, ratio_h)

# Comment out the problematic polys adjustment
#polys = craft_utils.adjustResultCoordinates(polys, ratio_w, ratio_h)

print(datetime.now()- start)


import file_utils
file_utils.saveResult('outputs/', img[:,:,::-1], boxes, dirname=output_dir)


