"""Where B2 looks on a whole rust leaf: a fused LayerCAM map, compared with the leaf's orange rust pixels.

Run from the repository root with the Hugging Face B2 download (see saliency.py):
    training/.venv/bin/python -W ignore videos/technical/analysis/rustfocus.py <download-folder>

Leaves: every whole-leaf BRACOL photo labelled rust in the held-out test split of
training/manifests/scale_v3_manifest.json that is on this machine.

Prediction: the app's TFLite export (same preprocessing and calibrated softmax as saliency.py).

Map: LayerCAM (Jiang et al. 2021) for the rust class from MBConv stages 4, 5 and 6 of the PyTorch weights
(blocks.3 and blocks.4 at 14x14, blocks.5 at 7x7), each with its top-left padding cell zeroed, upsampled to
640 px, normalised and averaged. Fusing layers is the LayerCAM paper's way to get a finer map than one layer.

Rust pixels: in the same 224-pixel crop, pixels with HSV hue 15-50 degrees, saturation above 0.45 and value
above 0.35, i.e. the orange of urediniospore pustules.

Score: the share of the map's energy that falls on rust pixels dilated by 12 px, divided by the share of the
crop those pixels cover (1.0 means no better than chance). Every leaf's score is saved; the leaf shown in the
video is the TFLite-correct leaf with the highest score, and is labelled as the clearest of the set.

Writes videos/technical/public/analysis/focus-leaf.png, focus-heat.png, focus-rust.png and rustfocus.json.
"""

import json
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as functional
from PIL import Image
from scipy.ndimage import binary_dilation

ROOT = Path(__file__).resolve().parents[3]
TRAINING = ROOT / "training"
sys.path.insert(0, str(TRAINING))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai_edge_litert.interpreter import Interpreter  # noqa: E402
from b2_model import load_model  # noqa: E402
from gradcam import crop_of_original, save_mask, tensor  # noqa: E402
from model_utils import LABELS  # noqa: E402
from saliency import app_state, tflite_predict, verify  # noqa: E402

OUT = ROOT / "videos/technical/public/analysis"
SIZE = 640
RUST = LABELS.index("rust")


def layer_map(model, path, block):
    captured = {}
    handle = model.blocks[block].register_forward_hook(lambda _m, _i, output: captured.update(a=output))
    logits = model(tensor(path))
    handle.remove()
    gradient = torch.autograd.grad(logits[0, RUST], captured["a"])[0]
    cam = functional.relu((functional.relu(gradient) * captured["a"]).sum(1, keepdim=True))
    cam[:, :, 0, 0] = 0
    cam = functional.interpolate(cam, size=(SIZE, SIZE), mode="bilinear", align_corners=False)[0, 0].detach().numpy()
    return cam / (cam.max() + 1e-8)


def rust_mask(crop):
    hsv = np.asarray(crop.convert("HSV"), dtype=np.float64) / 255
    hue = hsv[..., 0] * 360
    return (hue >= 15) & (hue <= 50) & (hsv[..., 1] > 0.45) & (hsv[..., 2] > 0.35)


def focus_score(heat, mask):
    if mask.mean() < 0.002:
        return 0.0
    near = binary_dilation(mask, iterations=12)
    return float((heat * near).sum() / (heat.sum() + 1e-8) / near.mean())


def main():
    folder = Path(sys.argv[1])
    verify(folder)
    model = load_model(folder / "model.safetensors").eval()
    config = json.loads((folder / "model-config.json").read_text())
    interpreter = Interpreter(model_path=str(folder / "model.tflite"), num_threads=4)
    interpreter.allocate_tensors()
    manifest = json.loads((TRAINING / "manifests/scale_v3_manifest.json").read_text())["images"]
    rows = [r for r in manifest if r["source"] == "bracol_leaf" and r["label"] == "rust" and r["split"] == "test" and (TRAINING / r["path"]).exists()]
    results = []
    for row in rows:
        path = TRAINING / row["path"]
        predicted, probability, state = app_state(tflite_predict(interpreter, path), config)
        heat = np.mean([layer_map(model, path, block) for block in (3, 4, 5)], axis=0)
        heat = heat / (heat.max() + 1e-8)
        crop = crop_of_original(path, size=SIZE)
        results.append({"path": row["path"], "predicted": predicted, "probability": round(probability, 4), "state": state, "score": round(focus_score(heat, rust_mask(crop)), 3), "_heat": heat, "_crop": crop})
    correct = [item for item in results if item["predicted"] == "rust"]
    best = max(correct, key=lambda item: item["score"])
    best["_crop"].save(OUT / "focus-leaf.png")
    save_mask(best["_heat"] ** 1.5, OUT / "focus-heat.png")
    save_mask(binary_dilation(rust_mask(best["_crop"]), iterations=2).astype(float), OUT / "focus-rust.png")
    public = [{key: value for key, value in item.items() if not key.startswith("_")} for item in results]
    scores = [item["score"] for item in public]
    output = {
        "method": __doc__.strip(),
        "leaves": len(public),
        "tflite_correct": len(correct),
        "median_score": float(np.median(scores)),
        "chosen": {key: value for key, value in best.items() if not key.startswith("_")},
        "all": public,
    }
    (OUT / "rustfocus.json").write_text(json.dumps(output, indent=1))
    print(json.dumps({key: output[key] for key in ("leaves", "tflite_correct", "median_score", "chosen")}, indent=1))


if __name__ == "__main__":
    main()
