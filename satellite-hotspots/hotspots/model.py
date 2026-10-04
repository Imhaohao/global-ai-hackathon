"""Optional RGB+NIR SegFormer adapter. Scores are not calibrated probabilities."""
import json
from pathlib import Path

CLASSES = ['drydown', 'nutrient_deficiency', 'water', 'weed_cluster',
           'double_plant', 'endrow', 'planter_skip', 'waterway']
MEAN = [0.485, 0.456, 0.406, 0.5]
STD = [0.229, 0.224, 0.225, 0.25]


def enable_mps_batchnorm_workaround(model):
    """PyTorch 2.13 MPS BN backward requires contiguous decoder feature maps.

    Preserve all learned weights and the module architecture. Hooks only change
    memory layout; the small actual backward diagnostic is retained in validation.
    """
    model.decode_head.batch_norm.register_forward_pre_hook(
        lambda module,args: (args[0].contiguous(),))
    model.decode_head.batch_norm.register_forward_hook(
        lambda module,args,out: out.contiguous())


def device_name():
    import torch
    return 'cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu')


def tensor_image(image, size=256):
    import numpy as np
    import torch
    import torch.nn.functional as F
    array = np.asarray(image, dtype=np.float32)
    if array.ndim != 3 or array.shape[0] != 4 or not np.isfinite(array).all():
        raise ValueError('Model input must be finite [4,H,W] in R,G,B,NIR order')
    if array.min() < 0 or array.max() > 1:
        raise ValueError('Model input must use recorded [0,1] scaling')
    x = torch.from_numpy(array.copy()).unsqueeze(0)
    x = F.interpolate(x, size=(size, size), mode='bilinear', align_corners=False)
    return (x - torch.tensor(MEAN)[None, :, None, None]) / torch.tensor(STD)[None, :, None, None]


class CropModel:
    def __init__(self, checkpoint):
        import torch
        from transformers import SegformerForSemanticSegmentation
        self.path = Path(checkpoint)
        self.metadata = json.loads((self.path / 'training-summary.json').read_text())
        self.device = device_name()
        self.model = SegformerForSemanticSegmentation.from_pretrained(
            self.path, local_files_only=True).to(self.device).eval()
        if self.device == 'mps': enable_mps_batchnorm_workaround(self.model)
        self.version = self.metadata['model_version']

    def predict(self, image):
        import torch
        import torch.nn.functional as F
        h, w = image.shape[1:]
        with torch.inference_mode():
            logits = self.model(pixel_values=tensor_image(image, self.metadata['input_size']).to(self.device)).logits
            logits = F.interpolate(logits, size=(h, w), mode='bilinear', align_corners=False)
            return logits.sigmoid()[0].cpu().numpy()
