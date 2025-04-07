# -*- coding: utf-8 -*-
import os
import numpy as np
import cv2
import imgproc

# borrowed from https://github.com/lengstrom/fast-style-transfer/blob/master/src/utils.py
def get_files(img_dir):
    imgs, masks, xmls = list_files(img_dir)
    return imgs, masks, xmls

def list_files(in_path):
    img_files = []
    mask_files = []
    gt_files = []
    for (dirpath, dirnames, filenames) in os.walk(in_path):
        for file in filenames:
            filename, ext = os.path.splitext(file)
            ext = str.lower(ext)
            if ext == '.jpg' or ext == '.jpeg' or ext == '.gif' or ext == '.png' or ext == '.pgm':
                img_files.append(os.path.join(dirpath, file))
            elif ext == '.bmp':
                mask_files.append(os.path.join(dirpath, file))
            elif ext == '.xml' or ext == '.gt' or ext == '.txt':
                gt_files.append(os.path.join(dirpath, file))
            elif ext == '.zip':
                continue
    # img_files.sort()
    # mask_files.sort()
    # gt_files.sort()
    return img_files, mask_files, gt_files

def saveResult(img_file, img, boxes, dirname='./result/', verticals=None, texts=None, use_blur=True, 
              total_left_offset=0, total_right_offset=0, dark_mode=False):
    img = np.array(img)
    filename, file_ext = os.path.splitext(os.path.basename(img_file))
    res_img_file = dirname + "res_out" + filename + '.jpg'

    if not os.path.isdir(dirname):
        os.mkdir(dirname)

    # Create background based on theme
    if dark_mode:
        bg_color = np.array([0, 0, 0])  # Pure black background for dark mode
    else:
        bg_color = np.array([255, 255, 255])  # White background for light mode
    
    white_img = np.ones_like(img) * bg_color

    for i, box in enumerate(boxes):
        poly = np.array(box).astype(np.int32).reshape((-1))

        poly = poly.reshape(-1, 2)
        x_coords = poly[:, 0]
        y_coords = poly[:, 1]
        
        x1 = max(0, min(x_coords) - total_left_offset)
        y1 = max(0, min(y_coords) - 15)
        x2 = min(img.shape[1], max(x_coords) + total_right_offset)
        y2 = min(img.shape[0], max(y_coords) + 30)
        
        cropped_segment = img[y1:y2, x1:x2]
        x = cv2.cvtColor(cropped_segment, cv2.COLOR_BGR2GRAY)
        ret, thresh_img = cv2.threshold(x, 50, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
        
        if use_blur:
            thresh_img = cv2.blur(thresh_img, (7,7))
        
        # Handle theme-specific processing
        if dark_mode:
            thresh_img = cv2.bitwise_not(thresh_img)
            processed_segment = cv2.cvtColor(thresh_img, cv2.COLOR_GRAY2BGR)
            processed_segment[thresh_img == 255] = [224, 224, 224]  # Light gray color in BGR (was [255, 255, 162])
        else:
            processed_segment = cv2.cvtColor(thresh_img, cv2.COLOR_GRAY2BGR)
        
        white_img[y1:y2, x1:x2] = processed_segment
        
        if texts is not None:
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            text_color = (224, 224, 224) if dark_mode else (0, 0, 0)  # Updated dark mode text color
            cv2.putText(white_img, "{}".format(texts[i]), (poly[0][0]+1, poly[0][1]+1), 
                       font, font_scale, (0, 0, 0), thickness=1)
            cv2.putText(white_img, "{}".format(texts[i]), tuple(poly[0]), 
                       font, font_scale, text_color, thickness=1)

    cv2.imwrite(res_img_file, white_img)

