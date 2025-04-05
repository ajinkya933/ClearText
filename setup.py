import sys
import subprocess
import os
import site
import importlib.util

print("Running ClearText OCR setup script...")

# List of required packages to check
required_packages = [
    'torch',
    'torchvision',
    'scikit-image',
    'scipy',
    'onnx',
    'onnxruntime',
    'streamlit',
    'opencv-python',
    'gdown',
    'craft-text-detector',
    'numpy',
    'Pillow',
    'matplotlib'
]

# Check if packages are installed
print("Checking required packages...")
for package in required_packages:
    try:
        importlib.import_module(package.replace('-', '_'))
        print(f"✓ {package} is installed")
    except ImportError:
        print(f"✗ {package} is not installed")

# Get site-packages directory
site_packages = site.getsitepackages()[0]
print(f"Site packages directory: {site_packages}")

# Create craft_utils.py
print("Creating craft_utils.py...")
craft_utils_content = """
import math
import cv2
import numpy as np


def generate_words(char_bboxes, char_scores, decoder):
    '''
    Generate words bounding boxes with scores.
    Implements character-level bounding box merging to obtain word bounding boxes. 
    '''
    words = []
    char_bboxes = np.array(char_bboxes, np.int32)
    char_scores = np.array(char_scores, np.float32)

    word = []
    word_score = []
    for i, [char_bbox, score] in enumerate(zip(char_bboxes, char_scores)):
        try:
            char = decoder(char_bbox)
        except:
            print("CRAFT: Error when decoding character!")
            continue
        if char == "":
            if len(word) > 0:
                if len(word) == 1:
                    word_bbox = word[0]
                else:
                    word_bbox = merge_bboxes(np.array(word, np.int32))

                words.append([word_bbox, np.mean(np.array(word_score))])

                word = []
                word_score = []
        else:
            word.append(char_bbox)
            word_score.append(score)

    if len(word) > 0:
        if len(word) == 1:
            word_bbox = word[0]
        else:
            word_bbox = merge_bboxes(np.array(word, np.int32))

        words.append([word_bbox, np.mean(np.array(word_score))])

    return words


def merge_bboxes(bboxes):
    """
    Merge multiple bounding boxes into one.
    """
    xmin = np.min(bboxes[:, 0::2])
    ymin = np.min(bboxes[:, 1::2])
    xmax = np.max(bboxes[:, 0::2])
    ymax = np.max(bboxes[:, 1::2])

    return [xmin, ymin, xmax, ymin, xmax, ymax, xmin, ymax]


def get_rotated_box(points):
    """
    Creates rotated box.
    Returns the minimum area rectangle containing the input points.
    """
    rect = cv2.minAreaRect(points)
    box = cv2.boxPoints(rect)
    box = np.int0(box)

    return box


def poly_to_box(poly):
    """
    Convert polygon representation to bounding box.
    """
    return [np.min(poly[:, 0]), np.min(poly[:, 1]), 
            np.max(poly[:, 0]), np.max(poly[:, 1])]


def adjust_result_coordinates(polys, ratio_w, ratio_h, ratio_net=2):
    """
    Adjusts predicted coordinates according to ratio.
    """
    if len(polys) > 0:
        polys = np.array(polys)
        for k in range(len(polys)):
            if polys[k] is not None:
                polys[k] *= (ratio_w * ratio_net, ratio_h * ratio_net)
    return polys


def sort_detection(dt_boxes, image_height):
    """
    Sort detection results from top to bottom and left to right.
    """
    if len(dt_boxes) == 0:
        return dt_boxes

    def y_axis_sort(box):
        return box[0][1]

    dt_boxes = sorted(dt_boxes, key=y_axis_sort)
    
    threshold = 0.1 * image_height
    
    groups = []
    group = [dt_boxes[0]]
    
    for box in dt_boxes[1:]:
        last_box = group[-1]
        if box[0][1] - last_box[0][1] < threshold:
            group.append(box)
        else:
            groups.append(group)
            group = [box]
    
    if len(group) > 0:
        groups.append(group)
    
    result = []
    for g in groups:
        # Sort from left to right for each group
        sorted_g = sorted(g, key=lambda box: box[0][0])
        result.extend(sorted_g)
    
    return result
"""

# Create imgproc.py
print("Creating imgproc.py...")
imgproc_content = """
import cv2
import numpy as np


def resize_aspect_ratio(img, square_size, interpolation, mag_ratio=1):
    """
    Resize the image to fit the square (output size is not exactly square_size).
    Used when the image is resized on the longer side to square_size.
    """
    height, width, channel = img.shape

    # magnify image size
    target_size = mag_ratio * max(height, width)

    # set original image size
    if target_size > square_size:
        target_size = square_size

    ratio = target_size / max(height, width)

    target_h, target_w = int(height * ratio), int(width * ratio)
    proc = cv2.resize(img, (target_w, target_h), interpolation=interpolation)

    # make canvas and paste image
    target_h32, target_w32 = target_h, target_w
    if target_h % 32 != 0:
        target_h32 = target_h + (32 - target_h % 32)
    if target_w % 32 != 0:
        target_w32 = target_w + (32 - target_w % 32)
    resized = np.zeros((target_h32, target_w32, channel), dtype=np.float32)
    resized[0:target_h, 0:target_w, :] = proc
    target_h, target_w = target_h32, target_w32

    size_heatmap = (int(target_w / 2), int(target_h / 2))

    return resized, ratio, size_heatmap


def normalizeMeanVariance(in_img, mean=(0.485, 0.456, 0.406), variance=(0.229, 0.224, 0.225)):
    """
    Normalize mean and variance of the input image.
    Used for preprocessing the image.
    """
    # should be RGB order
    img = in_img.copy().astype(np.float32)

    img -= np.array([mean[0] * 255.0, mean[1] * 255.0, mean[2] * 255.0], dtype=np.float32)
    img /= np.array([variance[0] * 255.0, variance[1] * 255.0, variance[2] * 255.0], dtype=np.float32)
    return img


def denormalizeMeanVariance(in_img, mean=(0.485, 0.456, 0.406), variance=(0.229, 0.224, 0.225)):
    """
    Reverse normalization of mean and variance.
    """
    # should be RGB order
    img = in_img.copy()
    img *= variance
    img += mean
    img *= 255.0
    img = np.clip(img, 0, 255).astype(np.uint8)
    return img
"""

# Create file_utils.py
print("Creating file_utils.py...")
file_utils_content = """
import os
import numpy as np
import cv2
from PIL import Image
import io


def read_image(img_path):
    """
    Read image from path.
    """
    try:
        if os.path.isfile(img_path):
            img = cv2.imread(img_path)
            # Convert from BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            return img
        else:
            return None
    except Exception as e:
        print(f"Error reading image: {e}")
        return None


def save_result(img_path, img, boxes, dirname='./result/', verticals=None, texts=None):
    """
    Save detection result.
    """
    try:
        img = np.array(img)

        # make result file list
        filename, file_ext = os.path.splitext(os.path.basename(img_path))

        # create output directory
        os.makedirs(dirname, exist_ok=True)
        
        # Save to directory
        result_file = os.path.join(dirname, f"{filename}_result{file_ext}")
        img_with_boxes = np.copy(img)

        # Draw boxes
        for i, box in enumerate(boxes):
            poly = np.array(box).astype(np.int32).reshape((-1))
            poly = poly.reshape(-1, 2)
            cv2.polylines(img_with_boxes, [poly.reshape((-1, 1, 2))], True, color=(0, 0, 255), thickness=2)

        # Convert from RGB to BGR for OpenCV
        img_with_boxes = cv2.cvtColor(img_with_boxes, cv2.COLOR_RGB2BGR)
        cv2.imwrite(result_file, img_with_boxes)

        return result_file
    except Exception as e:
        print(f"Error saving result: {e}")
        return None
"""

# Write the files to the site-packages directory
files_to_create = {
    'craft_utils.py': craft_utils_content,
    'imgproc.py': imgproc_content,
    'file_utils.py': file_utils_content
}

for filename, content in files_to_create.items():
    file_path = os.path.join(site_packages, filename)
    with open(file_path, 'w') as f:
        f.write(content)
    print(f"Created {file_path}")

# Test if craft_utils can be imported now
try:
    import craft_utils
    print("✓ Successfully imported craft_utils")
except ImportError as e:
    print(f"✗ Failed to import craft_utils: {e}")

print("Setup complete!") 