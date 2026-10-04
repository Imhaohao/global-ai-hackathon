"""Colour statistics of the coffee-leaf training images, per class, for the technical video.

Run from the repository root with the training environment:
    training/.venv/bin/python -W ignore videos/technical/analysis/chroma.py

Reads training/manifests/scale_v3_manifest.json and the images present under training/data.
Writes videos/technical/public/analysis/chroma.json.

Pixels: each image is resized so its long side is 96 px and converted from sRGB to CIELAB (D65).
Near-white background (L* > 88 and chroma < 10) and near-black pixels (L* < 6) are dropped.

Lesion colour: over the expert-cropped BRACOL symptom images of the train split (each crop is centred
on one lesion), per class: the median L*, a* (green to red) and b* (blue to yellow) of all kept
pixels, the share of pixels on the red side of neutral (a* > 0), and per-image mean (a*, b*) points
for a scatter plot.

Colour-only baseline: logistic regression on an 8x8 a*b* histogram plus a 6-bin L* histogram per
image, trained on the train split and scored on the validation split, over the five coffee classes
and every image of those splits present on this machine. The scored validation paths and
predictions are saved so the B2 checkpoint can be scored on exactly the same images (gradcam.py).
"""

import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[3]
TRAINING = ROOT / "training"
OUTPUT = ROOT / "videos/technical/public/analysis/chroma.json"
CLASSES = ["healthy", "rust", "cercospora", "miner", "phoma"]
LESION_SOURCE = "bracol_symptom"
SCATTER_PER_CLASS = 140
SEED = 20261003


def srgb_to_lab(rgb):
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    matrix = np.array(
        [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]
    )
    xyz = linear @ matrix.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return 116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])


def pixels(path):
    image = Image.open(path).convert("RGB")
    image.thumbnail((96, 96))
    rgb = np.asarray(image, dtype=np.float64).reshape(-1, 3) / 255
    lightness, a_star, b_star = srgb_to_lab(rgb)
    chroma = np.hypot(a_star, b_star)
    keep = ~(((lightness > 88) & (chroma < 10)) | (lightness < 6))
    if keep.sum() < 50:
        return None
    return lightness[keep], a_star[keep], b_star[keep]


def histogram_features(sample):
    lightness, a_star, b_star = sample
    histogram_ab, _, _ = np.histogram2d(a_star, b_star, bins=8, range=[[-40, 40], [-10, 70]])
    histogram_l, _ = np.histogram(lightness, bins=6, range=[0, 100])
    return np.concatenate([histogram_ab.ravel() / len(a_star), histogram_l / len(lightness)])


def records():
    manifest = json.loads((TRAINING / "manifests/scale_v3_manifest.json").read_text())
    return [
        row
        for row in manifest["images"]
        if row["label"] in CLASSES
        and row["split"] in ("train", "val")
        and (TRAINING / row["path"]).exists()
    ]


def lesion_summary(stack):
    lightness, a_star, b_star = (np.concatenate(part) for part in zip(*stack))
    return {
        "images": len(stack),
        "pixels": int(len(a_star)),
        "share_a_positive": round(float((a_star > 0).mean()), 4),
        "median_l": round(float(np.median(lightness)), 2),
        "median_a": round(float(np.median(a_star)), 2),
        "median_b": round(float(np.median(b_star)), 2),
    }


def colour_baseline(vectors, labels, splits):
    train = np.array([split == "train" for split in splits])
    scaler = StandardScaler().fit(vectors[train])
    model = LogisticRegression(max_iter=4000, class_weight="balanced")
    model.fit(scaler.transform(vectors[train]), labels[train])
    predicted = model.predict(scaler.transform(vectors[~train]))
    return float((predicted == labels[~train]).mean()), int(train.sum()), predicted


def main():
    random.seed(SEED)
    rows, kept, vectors = records(), [], []
    lesions = defaultdict(list)
    for row in rows:
        sample = pixels(TRAINING / row["path"])
        if sample is None:
            continue
        kept.append(row)
        vectors.append(histogram_features(sample))
        if row["source"] == LESION_SOURCE and row["split"] == "train":
            lesions[row["label"]].append(sample)
    labels = np.array([row["label"] for row in kept])
    splits = [row["split"] for row in kept]
    accuracy, train_n, predicted = colour_baseline(np.nan_to_num(np.array(vectors)), labels, splits)
    val_rows = [row for row in kept if row["split"] == "val"]
    scatter = {
        label: [
            {"a": round(float(a.mean()), 2), "b": round(float(b.mean()), 2)}
            for _, a, b in random.sample(stack, min(SCATTER_PER_CLASS, len(stack)))
        ]
        for label, stack in lesions.items()
    }
    output = {
        "method": __doc__.strip(),
        "classes": CLASSES,
        "lesion_source": LESION_SOURCE,
        "lesion": {label: lesion_summary(stack) for label, stack in lesions.items()},
        "scatter": scatter,
        "colour_only": {
            "val_accuracy": round(accuracy, 4),
            "train_images": train_n,
            "val_images": len(val_rows),
            "sources": dict(Counter(row["source"] for row in kept)),
            "val_paths": [row["path"] for row in val_rows],
            "val_labels": [row["label"] for row in val_rows],
            "val_predictions": predicted.tolist(),
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output))
    summary = {key: output[key] for key in ("lesion",)}
    summary["colour_only"] = {k: v for k, v in output["colour_only"].items() if not k.startswith("val_") or k == "val_accuracy" or k == "val_images"}
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
