"""Grad-CAM maps, real feature maps and a colour-only comparison from the B2 checkpoint.

Run from the repository root after chroma.py:
    training/.venv/bin/python -W ignore videos/technical/analysis/gradcam.py

Model: training/checkpoints/efficientnet_b2/best.safetensors (the selected B2 PyTorch checkpoint,
SHA256 eb6a5d4d...), loaded with training/b2_model.py. Preprocessing is the app contract from
training/model_utils.py: bicubic resize of the short side to 256, centre crop 224, ImageNet mean/std.
This is the PyTorch checkpoint, not the INT8-weight TFLite export, so its scores can differ slightly.

Outputs in videos/technical/public/analysis/:
  - cam-<n>.png and cam-<n>-heat.png: the 224 crop the network sees (rendered at 640 px from the
    original pixels) and its class-activation heat as a white mask with alpha = heat. The map is
    LayerCAM (Jiang et al. 2021, a Grad-CAM variant that weights each activation by its own positive
    gradient) on the output of MBConv stage 6 (blocks.5, 7x7 cells), for the predicted class.
    Every deep layer of this checkpoint puts a strong response in the top-left corner cell whatever
    the image (a zero-padding artifact, visible in plain Grad-CAM on conv_head too), so that one cell
    is set to zero before normalising. The 7x7 map is upsampled bilinearly.
  - stage-<k>.png: the mean absolute activation of each of the 7 MBConv stages for the first leaf.
  - stem-<c>.png: eight channels of the stem convolution for the first leaf.
  - gradcam.json: the chosen images, predictions and the B2 accuracy on exactly the validation images
    the colour-only baseline in chroma.json was scored on.
"""

import json
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as functional
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
TRAINING = ROOT / "training"
sys.path.insert(0, str(TRAINING))

from b2_model import load_model  # noqa: E402
from model_utils import LABELS, image_transform  # noqa: E402

OUT = ROOT / "videos/technical/public/analysis"
CHECKPOINT = TRAINING / "checkpoints/efficientnet_b2/best.safetensors"
PICKS = [
    ("bracol_leaf", "rust", 2),
    ("bracol_symptom", "rust", 1),
    ("bracol_symptom", "cercospora", 1),
    ("bracol_symptom", "miner", 1),
    ("bracol_symptom", "phoma", 1),
]
TRANSFORM = image_transform()


def tensor(path):
    return TRANSFORM(Image.open(path).convert("RGB")).unsqueeze(0)


def crop_of_original(path, size=640):
    image = Image.open(path).convert("RGB")
    short = min(image.size)
    side = short * 224 / 256
    left, top = (image.width - side) / 2, (image.height - side) / 2
    return image.crop((left, top, left + side, top + side)).resize((size, size), Image.BICUBIC)


def accuracy_on(model, paths, labels):
    correct = 0
    with torch.no_grad():
        for start in range(0, len(paths), 64):
            batch = torch.cat([tensor(TRAINING / path) for path in paths[start : start + 64]])
            predicted = model(batch).argmax(1).tolist()
            correct += sum(
                LABELS[index] == label
                for index, label in zip(predicted, labels[start : start + 64])
            )
    return correct / len(paths)


def grad_cam(model, path):
    captured = {}
    handle = model.blocks[5].register_forward_hook(lambda _m, _i, output: captured.update(a=output))
    logits = model(tensor(path))
    handle.remove()
    probabilities = logits.softmax(1)[0]
    index = int(probabilities.argmax())
    activation = captured["a"]
    gradient = torch.autograd.grad(logits[0, index], activation)[0]
    cam = functional.relu((functional.relu(gradient) * activation).sum(1, keepdim=True))
    cam[:, :, 0, 0] = 0
    cam = functional.interpolate(cam, size=(640, 640), mode="bilinear", align_corners=False)
    cam = cam[0, 0].detach().numpy()
    return cam / (cam.max() + 1e-8), LABELS[index], float(probabilities[index])


def save_mask(array, path):
    alpha = (np.clip(array, 0, 1) * 255).astype(np.uint8)
    rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = alpha
    Image.fromarray(rgba, "RGBA").save(path)


def candidates(manifest, source, label):
    return [
        row
        for row in manifest
        if row["source"] == source
        and row["label"] == label
        and row["split"] == "test"
        and (TRAINING / row["path"]).exists()
    ]


def confident_correct(model, rows, label, count):
    scored = []
    with torch.no_grad():
        for row in rows[:400]:
            probabilities = model(tensor(TRAINING / row["path"])).softmax(1)[0]
            if LABELS[int(probabilities.argmax())] == label:
                scored.append((float(probabilities.max()), row))
    scored.sort(key=lambda item: -item[0])
    return [row for _, row in scored[:count]]


def feature_maps(model, path):
    stages = []
    hooks = [block.register_forward_hook(lambda _m, _i, out: stages.append(out)) for block in model.blocks]
    stem = {}
    hooks.append(model.bn1.register_forward_hook(lambda _m, _i, out: stem.update(a=out)))
    with torch.no_grad():
        model(tensor(path))
    for hook in hooks:
        hook.remove()
    for index, activation in enumerate(stages):
        save_normalised(activation[0].abs().mean(0).numpy(), OUT / f"stage-{index + 1}.png")
    for channel in range(8):
        save_normalised(stem["a"][0, channel * 4].numpy(), OUT / f"stem-{channel + 1}.png")
    return [list(activation.shape[1:]) for activation in stages]


def save_normalised(array, path):
    array = (array - array.min()) / (array.max() - array.min() + 1e-8)
    Image.fromarray((array * 255).astype(np.uint8), "L").resize((320, 320), Image.NEAREST).save(path)


def main():
    torch.manual_seed(0)
    model = load_model(CHECKPOINT).eval()
    manifest = json.loads((TRAINING / "manifests/scale_v3_manifest.json").read_text())["images"]
    chroma = json.loads((OUT / "chroma.json").read_text())["colour_only"]
    b2_accuracy = accuracy_on(model, chroma["val_paths"], chroma["val_labels"]) if "--skip-accuracy" not in sys.argv else json.loads((OUT / "gradcam.json").read_text())["b2_val_accuracy_same_images"]
    chosen = []
    for source, label, count in PICKS:
        for row in confident_correct(model, candidates(manifest, source, label), label, count):
            number = len(chosen) + 1
            cam, predicted, confidence = grad_cam(model, TRAINING / row["path"])
            crop_of_original(TRAINING / row["path"]).save(OUT / f"cam-{number}.png")
            save_mask(cam, OUT / f"cam-{number}-heat.png")
            chosen.append({"n": number, "path": row["path"], "source": source, "label": label, "predicted": predicted, "confidence": round(confidence, 4)})
    shapes = feature_maps(model, TRAINING / chosen[0]["path"])
    result = {
        "method": __doc__.strip(),
        "checkpoint": str(CHECKPOINT.relative_to(ROOT)),
        "b2_val_accuracy_same_images": round(b2_accuracy, 4),
        "colour_only_val_accuracy": chroma["val_accuracy"],
        "val_images": len(chroma["val_paths"]),
        "chosen": chosen,
        "stage_shapes": shapes,
    }
    (OUT / "gradcam.json").write_text(json.dumps(result, indent=1))
    print(json.dumps({k: v for k, v in result.items() if k != "method"}, indent=1))


if __name__ == "__main__":
    main()
