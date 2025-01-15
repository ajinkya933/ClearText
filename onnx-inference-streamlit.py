from datetime import datetime
start = datetime.now()

from craft_text_detector import export_detected_regions
import torch
#torch.set_num_threads(3)
import cv2
import onnxruntime as rt
import numpy as np
import craft_utils
import imgproc



def read_graph(x): 
    #sess = rt.InferenceSession("model_640_480.onnx") #resize to 320x240 - bad results
    sess = rt.InferenceSession("weights/model.onnx") #1000x960 resize to 512x384
    input_name = sess.get_inputs()[0].name

    y, feature = sess.run(None, {input_name: x.numpy()})

    # make score and link map
    score_text = y[0, :, :, 0]
    score_link = y[0, :, :, 1]

    # refine link
    #with torch.no_grad():
    #    y_refiner = refine_net(y, feature)
    #score_link = y_refiner[0,:,:,0].cpu().data.numpy()

    boxes, polys = craft_utils.getDetBoxes(score_text, score_link, 0.5, 0.4, 0.4, True)
    boxes, num_box = craft_utils.adjustResultCoordinates(boxes, ratio_w, ratio_h)
    print(boxes[0][1])
    print(len(boxes))
    print(num_box)
    # num_box = len(boxes)
    image2 = 255 * np.ones(img.shape, np.uint8)  # white blank image

    for i in range(0, num_box):
        pts = np.array(boxes[0][i],np.int32)
        #pts = pts.reshape((-1,1,2))
        #print(pts)
        x1 = pts[0][0] 
        y1 = pts[0][1] #-15    # upar se katata he ye 
        x2 = pts[1][0] 
        y2 = pts[2][1] #+30    # niche se katata he ye
        #print('\n')
        #print(x1,y1,x2,y2)


        # Build output; initialize white background
        cropped_segment = img[y1:y2, x1:x2]
        x= cv2.cvtColor(cropped_segment, cv2.COLOR_BGR2GRAY)

        #ret,thresh_img = cv2.threshold(x,150,255,cv2.THRESH_BINARY)
        ret,thresh_img = cv2.threshold(x,50,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)
        #blurimage=cv2.blur(thresh_img,(2,2))
        blurimage=cv2.blur(thresh_img,(7,7))



        #x= cv2.cvtColor(cropped_segment, cv2.COLOR_BGR2GRAY)
        
        image2[y1:y2, x1:x2] = cv2.cvtColor(blurimage, cv2.COLOR_GRAY2BGR)

         #img2 = cv2.polylines(img,[pts],True,(0,255,0),2)
        

        

        

    return image2

img = cv2.imread('data/textbook.jpg')
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
x = x.unsqueeze(0)   

image=read_graph(x)
# cv2.imwrite('result_after_padding.jpg', image)
