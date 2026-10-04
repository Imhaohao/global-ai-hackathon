"""Forty real training leaves for the 'twenty thousand labelled leaves' shot: eight per class, fixed seed.

Run from the repository root:
    python3 videos/technical/analysis/tiles.py
Reads training/manifests/scale_v3_manifest.json (train split, images present on this machine, whole leaves or
crops at least 96 px on the short side) and writes videos/technical/public/analysis/tiles/<n>.jpg (160 px squares,
centre-cropped) plus tiles.json with each tile's class and source.
"""

import json
import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
TRAINING = ROOT / "training"
OUT = ROOT / "videos/technical/public/analysis/tiles"
CLASSES = ["healthy", "rust", "cercospora", "miner", "phoma"]
PER_CLASS = 8


def square(path, size=160):
    image = Image.open(path).convert("RGB")
    side = min(image.size)
    left, top = (image.width - side) // 2, (image.height - side) // 2
    return image.crop((left, top, left + side, top + side)).resize((size, size), Image.BICUBIC)


def main():
    generator = random.Random(20261004)
    rows = json.loads((TRAINING / "manifests/scale_v3_manifest.json").read_text())["images"]
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    for label in CLASSES:
        pool = sorted((r for r in rows if r["label"] == label and r["split"] == "train" and (TRAINING / r["path"]).exists()), key=lambda r: r["path"])
        chosen = []
        for row in generator.sample(pool, len(pool)):
            if min(Image.open(TRAINING / row["path"]).size) >= 96:
                chosen.append(row)
            if len(chosen) == PER_CLASS:
                break
        for row in chosen:
            number = len(tiles)
            square(TRAINING / row["path"]).save(OUT / f"{number}.jpg", quality=90)
            tiles.append({"n": number, "label": label, "source": row["source"], "path": row["path"]})
    (OUT.parent / "tiles.json").write_text(json.dumps(tiles, indent=1))
    print(len(tiles), "tiles")


if __name__ == "__main__":
    main()
