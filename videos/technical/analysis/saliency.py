"""Predictions and LayerCAM saliency on random held-out leaves, from the published B2 model on Hugging Face.

Download the model (outside the repository) first, for example into the session scratchpad:
    https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 at revision 31a46d723399aa5bb6305e5a9d1d50a74936f74c
    files: model.safetensors, model.tflite, model-config.json
Then run from the repository root:
    training/.venv/bin/python -W ignore videos/technical/analysis/saliency.py <download-folder>

Checks before use: the SHA256 of model.safetensors must equal the README's selected B2 checkpoint
(eb6a5d4d...) and model.tflite must equal the app export in mobile/assets/model/model-config-b2.json
(ddbea876...). The PyTorch model is rebuilt with timm and its parameters are counted.

Leaves: for each of healthy, rust, cercospora, miner and phoma, two leaves drawn with a fixed seed from the
whole-leaf BRACOL photos in the held-out test split of training/manifests/scale_v3_manifest.json. No
selection by result: whatever the model says is reported.

Prediction: the app's own TFLite export (INT8 weight storage, float32 compute, calibrated softmax inside the
graph) on float32 RGB 0..255, short side resized to 256 (bicubic) and centre-cropped to 224. The state is the
app rule from mobile/src/diagnosis/modelDecision.ts: at or above the class's confident threshold is
"confident", at or above its possible threshold is "possible", otherwise "unclear".

Saliency: LayerCAM (Jiang et al. 2021) on MBConv stage 6 (blocks.5, 7x7) of the PyTorch weights, for the
class the TFLite model predicted, with the top-left padding cell zeroed (see gradcam.py), upsampled bilinearly.

Writes videos/technical/public/analysis/leaf-<class>-<i>.png, leaf-<class>-<i>-heat.png and saliency.json.
"""

import hashlib
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as functional
from ai_edge_litert.interpreter import Interpreter
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
TRAINING = ROOT / "training"
sys.path.insert(0, str(TRAINING))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from b2_model import load_model  # noqa: E402
from gradcam import crop_of_original, save_mask, tensor  # noqa: E402
from model_utils import LABELS  # noqa: E402

OUT = ROOT / "videos/technical/public/analysis"
MODEL_URL = "https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2"
REVISION = "31a46d723399aa5bb6305e5a9d1d50a74936f74c"
CHECKPOINT_SHA256 = "eb6a5d4daac75046befce1250bc9278d4c1d2ccfa8ccf0fe2f4302cb918e8dd8"
TFLITE_SHA256 = "ddbea87650b839dabb376f32d7e210ccc21a105024de23b3c0abf25fbbe86a01"
CLASSES = ["healthy", "rust", "cercospora", "miner", "phoma"]
PER_CLASS = 2
SEED = 20261004


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(folder):
    found = {"safetensors": sha256(folder / "model.safetensors"), "tflite": sha256(folder / "model.tflite")}
    if found != {"safetensors": CHECKPOINT_SHA256, "tflite": TFLITE_SHA256}:
        raise ValueError(f"Downloaded weights differ from the README's B2: {found}")
    return found


def app_input(path):
    image = Image.open(path).convert("RGB")
    scale = 256 / min(image.size)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.BICUBIC)
    left, top = (image.width - 224) // 2, (image.height - 224) // 2
    crop = image.crop((left, top, left + 224, top + 224))
    return np.asarray(crop, dtype=np.float32)[None]


def tflite_predict(interpreter, path):
    interpreter.set_tensor(interpreter.get_input_details()[0]["index"], app_input(path))
    interpreter.invoke()
    return interpreter.get_tensor(interpreter.get_output_details()[0]["index"])[0]


def app_state(probabilities, config):
    index = int(np.argmax(probabilities))
    label = LABELS[index]
    if label == "unsupported":
        return label, float(probabilities[index]), "unclear"
    calibration = config["calibration"]
    probability = float(probabilities[index])
    if probability >= calibration["confident_thresholds"][index]:
        return label, probability, "confident"
    if probability >= calibration["class_thresholds"][index]:
        return label, probability, "possible"
    return label, probability, "unclear"


def layer_cam(model, path, class_index):
    captured = {}
    handle = model.blocks[5].register_forward_hook(lambda _m, _i, output: captured.update(a=output))
    logits = model(tensor(path))
    handle.remove()
    gradient = torch.autograd.grad(logits[0, class_index], captured["a"])[0]
    cam = functional.relu((functional.relu(gradient) * captured["a"]).sum(1, keepdim=True))
    cam[:, :, 0, 0] = 0
    cam = functional.interpolate(cam, size=(400, 400), mode="bilinear", align_corners=False)[0, 0].detach().numpy()
    return cam / (cam.max() + 1e-8), LABELS[int(logits.argmax())]


def chosen_leaves():
    manifest = json.loads((TRAINING / "manifests/scale_v3_manifest.json").read_text())["images"]
    generator = random.Random(SEED)
    picks = []
    for label in CLASSES:
        rows = sorted(
            (row for row in manifest if row["source"] == "bracol_leaf" and row["label"] == label and row["split"] == "test" and (TRAINING / row["path"]).exists()),
            key=lambda row: row["path"],
        )
        picks += generator.sample(rows, PER_CLASS)
    return picks


def main():
    folder = Path(sys.argv[1])
    hashes = verify(folder)
    model = load_model(folder / "model.safetensors").eval()
    parameters = sum(parameter.numel() for parameter in model.parameters())
    config = json.loads((folder / "model-config.json").read_text())
    interpreter = Interpreter(model_path=str(folder / "model.tflite"), num_threads=4)
    interpreter.allocate_tensors()
    results = []
    for row in chosen_leaves():
        number = sum(1 for item in results if item["truth"] == row["label"]) + 1
        name = f"leaf-{row['label']}-{number}"
        predicted, probability, state = app_state(tflite_predict(interpreter, TRAINING / row["path"]), config)
        cam, torch_label = layer_cam(model, TRAINING / row["path"], LABELS.index(predicted))
        crop_of_original(TRAINING / row["path"], size=400).save(OUT / f"{name}.png")
        save_mask(cam, OUT / f"{name}-heat.png")
        results.append({"image": name, "path": row["path"], "truth": row["label"], "predicted": predicted, "probability": round(probability, 4), "state": state, "pytorch_argmax": torch_label})
    output = {
        "method": __doc__.strip(),
        "model_url": MODEL_URL,
        "revision": REVISION,
        "sha256": hashes,
        "parameters": parameters,
        "leaves": results,
    }
    (OUT / "saliency.json").write_text(json.dumps(output, indent=1))
    print(json.dumps({key: value for key, value in output.items() if key != "method"}, indent=1))


if __name__ == "__main__":
    main()
