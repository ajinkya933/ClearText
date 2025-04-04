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

def saveResult(img_file, img, boxes, dirname='./result/', verticals=None, texts=None, use_blur=True, left_offset=10, right_offset=40):
    img = np.array(img)
    filename, file_ext = os.path.splitext(os.path.basename(img_file))
    res_img_file = dirname + "res_out" + filename + '.jpg'

    if not os.path.isdir(dirname):
        os.mkdir(dirname)

    white_img = np.ones_like(img) * 255

    for i, box in enumerate(boxes):
        poly = np.array(box).astype(np.int32).reshape((-1))

        # Get coordinates and expand by 10 pixels
        poly = poly.reshape(-1, 2)
        x_coords = poly[:, 0]
        y_coords = poly[:, 1]
        
        # Get expanded coordinates with padding
        x1 = max(0, min(x_coords) - left_offset)
        y1 = max(0, min(y_coords) - 15 )
        x2 = min(img.shape[1], max(x_coords) + right_offset) #40
        y2 = min(img.shape[0], max(y_coords) + 30)
        
        # Apply the original transformations
        cropped_segment = img[y1:y2, x1:x2]
        x = cv2.cvtColor(cropped_segment, cv2.COLOR_BGR2GRAY)
        ret, thresh_img = cv2.threshold(x, 50, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
        
        # Apply blur only if use_blur is True
        if use_blur:
            thresh_img = cv2.blur(thresh_img, (7,7))
        
        # Convert back to BGR and place in white image
        processed_segment = cv2.cvtColor(thresh_img, cv2.COLOR_GRAY2BGR)
        
        # Place the processed segment back in the white image
        white_img[y1:y2, x1:x2] = processed_segment
        
        if texts is not None:
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            cv2.putText(white_img, "{}".format(texts[i]), (poly[0][0]+1, poly[0][1]+1), 
                       font, font_scale, (0, 0, 0), thickness=1)
            cv2.putText(white_img, "{}".format(texts[i]), tuple(poly[0]), 
                       font, font_scale, (0, 255, 255), thickness=1)

    cv2.imwrite(res_img_file, white_img)

