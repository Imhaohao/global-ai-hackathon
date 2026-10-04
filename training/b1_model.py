"""Pinned ImageNet EfficientNet-B1 and the shared 224-pixel leaf contract."""

import hashlib
import json
import random
import urllib.request

import timm
import torch
from PIL import Image, ImageOps
from safetensors.torch import load_file
from torchvision import transforms

from model_utils import LABELS, ROOT, image_transform
from train_scale import scale_view

RUN = ROOT / "runs/efficientnet_b1"
MODEL_DIR = ROOT / "models/efficientnet_b1"
MANIFEST = ROOT / "data/scale_v3_manifest.json"
REPOSITORY = "timm/efficientnet_b1.ft_in1k"
REVISION = "1d6ddfd0ad535646fdb05bc3834913d93816152e"
PRETRAINED_SHA256 = "2eb860ed42ef594b3ae479669e306927bb4d4018e246e38f512b6b25b1734f6e"
SEED = 20261003
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download_pretrained():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for filename in ["config.json", "model.safetensors", "README.md"]:
        path = MODEL_DIR / filename
        if not path.exists():
            url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{filename}"
            with urllib.request.urlopen(url, timeout=120) as response:
                temporary = path.with_suffix(path.suffix + ".partial")
                with temporary.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
                temporary.replace(path)
    if sha256(MODEL_DIR / "model.safetensors") != PRETRAINED_SHA256:
        raise ValueError("Pinned EfficientNet-B1 weights failed SHA-256 verification")
    metadata = {
        "repository": REPOSITORY,
        "revision": REVISION,
        "license": "apache-2.0",
        "pretraining": "ImageNet-1k; no coffee disease head reused",
        "source": f"https://huggingface.co/{REPOSITORY}/tree/{REVISION}",
        "sha256": {
            name: sha256(MODEL_DIR / name)
            for name in ["config.json", "model.safetensors"]
        },
    }
    (MODEL_DIR / "provenance.json").write_text(json.dumps(metadata, indent=2))
    return metadata


def load_model(checkpoint=None):
    model = timm.create_model(
        "efficientnet_b1", pretrained=False, num_classes=len(LABELS)
    )
    path = checkpoint or MODEL_DIR / "model.safetensors"
    state = load_file(str(path))
    if checkpoint:
        model.load_state_dict(state, strict=True)
        return model
    state.pop("classifier.weight")
    state.pop("classifier.bias")
    result = model.load_state_dict(state, strict=False)
    if (
        set(result.missing_keys) != {"classifier.weight", "classifier.bias"}
        or result.unexpected_keys
    ):
        raise ValueError(f"Unexpected EfficientNet-B1 checkpoint keys: {result}")
    return model


class B1Dataset(torch.utils.data.Dataset):
    def __init__(self, records, mode="clean"):
        self.records, self.mode = records, mode
        self.canonical = image_transform()
        self.normalize = transforms.Compose(
            [transforms.ToTensor(), transforms.Normalize(MEAN, STD)]
        )
        self.jitter = transforms.ColorJitter(0.12, 0.12, 0.12, 0.02)

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        row = self.records[index]
        use_padding = self.mode in {"far", "context"} or (
            self.mode == "train" and random.random() >= 0.70
        )
        path = (
            row.get("context_path", row["path"])
            if use_padding and self.mode != "far"
            else row["path"]
        )
        with Image.open(ROOT / path) as original:
            image = original.convert("RGB")
        if self.mode == "train":
            image = self.augment(image)
        fraction = (
            random.uniform(0.65, 1.0)
            if self.mode == "train"
            else 0.65
            if self.mode == "far"
            else 1.0
        )
        tensor = (
            self.normalize(scale_view(image, fraction))
            if use_padding
            else self.canonical(image)
        )
        return tensor, LABELS.index(row["label"])

    def augment(self, image):
        if random.random() < 0.5:
            image = ImageOps.mirror(image)
        if random.random() < 0.3:
            image = ImageOps.flip(image)
        return self.jitter(image)
