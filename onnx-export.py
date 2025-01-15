import torch
from torch.autograd import Variable
import cv2
import imgproc
from craft import CRAFT
from collections import OrderedDict


def copyStateDict(state_dict):
    if list(state_dict.keys())[0].startswith("module"):
        start_idx = 1
    else:
        start_idx = 0
    new_state_dict = OrderedDict()
    for k, v in state_dict.items():
        name = ".".join(k.split(".")[start_idx:])
        new_state_dict[name] = v
    return new_state_dict






# load net
net = CRAFT()     # initialize


net.load_state_dict(copyStateDict(torch.load('./weights/craft_mlt_25k.pth', map_location='cpu')))
#net = net.cuda()
net.eval()
# load data
image = imgproc.loadImage('./data/textbook.jpg')

# Calculate dimensions that maintain aspect ratio
original_height, original_width = 4096, 3072
aspect_ratio = original_width / original_height

# Target width of 1280 (common size for CRAFT)
target_width = 1280
target_height = 960  # Fixed height that's divisible by 32

print(f"Export dimensions: {target_width}x{target_height}")

# resize
img_resized, target_ratio, size_heatmap = imgproc.resize_aspect_ratio(
    image, 
    square_size=target_width,
    interpolation=cv2.INTER_LINEAR, 
    mag_ratio=1.5
)
img_resized = cv2.resize(img_resized, (target_width, target_height), interpolation=cv2.INTER_LINEAR)

# preprocessing
x = imgproc.normalizeMeanVariance(img_resized)
x = torch.from_numpy(x).permute(2, 0, 1)    # [h, w, c] to [c, h, w]
x = Variable(x.unsqueeze(0))                # [c, h, w] to [b, c, h, w]
# x = x.cuda()

# Verify shape before export
print(f"Export tensor shape: {x.shape}")  # Should print [1, 3, 960, 1280]

# trace export
torch.onnx.export(net,
                  x,
                  'onnx/craft-bills.onnx',
                  input_names=['input'],
                  output_names=['output'],
                  export_params=True,
                  opset_version=11,
                  do_constant_folding=True,
                  verbose=False)