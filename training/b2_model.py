"""Pinned ImageNet EfficientNet-B2 using the common 224-pixel app contract."""

import json
import urllib.request

import timm
from safetensors.torch import load_file

from b1_model import B1Dataset
from b1_model import MEAN as MEAN
from b1_model import SEED as SEED
from b1_model import STD as STD
from b1_model import image_transform as image_transform
from b1_model import sha256
from model_utils import LABELS, ROOT

RUN = ROOT / "runs/efficientnet_b2"
MODEL_DIR = ROOT / "models/efficientnet_b2"
MANIFEST = ROOT / "data/scale_v3_manifest.json"
REPOSITORY = "timm/efficientnet_b2.ra_in1k"
REVISION = "3577c4a7d84723645311bb5a9e5086f1b62ec8e2"
PRETRAINED_SHA256 = "e9adbcce7e5d5055c571c4cafdcc7f920b6a6ec42e643c49dff1aabe1d5f53c5"
B2Dataset = B1Dataset


def download_pretrained():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for filename in ["config.json", "model.safetensors", "README.md"]:
        path = MODEL_DIR / filename
        if path.exists():
            continue
        url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{filename}"
        with urllib.request.urlopen(url, timeout=120) as response:
            temporary = path.with_suffix(path.suffix + ".partial")
            with temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            temporary.replace(path)
    if sha256(MODEL_DIR / "model.safetensors") != PRETRAINED_SHA256:
        raise ValueError("Pinned EfficientNet-B2 weights failed SHA-256 verification")
    config = json.loads((MODEL_DIR / "config.json").read_text())
    if config["architecture"] != "efficientnet_b2":
        raise ValueError("Unexpected pretrained architecture")
    if (
        config["pretrained_cfg"]["mean"] != MEAN
        or config["pretrained_cfg"]["std"] != STD
    ):
        raise ValueError("B2 pretraining normalization differs from the app contract")
    metadata = {
        "repository": REPOSITORY,
        "revision": REVISION,
        "license": "apache-2.0",
        "pretraining": "ImageNet-1k; no coffee disease head reused",
        "source": f"https://huggingface.co/{REPOSITORY}/tree/{REVISION}",
        "native_pretraining_resolution": 256,
        "published_test_resolution": 288,
        "fine_tuning_and_app_resolution": 224,
        "resolution_note": (
            "The checkpoint allows variable input sizes. Fine-tuning uses "
            "the same 224-pixel images as B1 for a controlled app comparison. "
            "This does not measure B2 at its published 288-pixel test setting."
        ),
        "sha256": {
            name: sha256(MODEL_DIR / name)
            for name in ["config.json", "model.safetensors"]
        },
    }
    (MODEL_DIR / "provenance.json").write_text(json.dumps(metadata, indent=2))
    return metadata


def load_model(checkpoint=None):
    model = timm.create_model(
        "efficientnet_b2", pretrained=False, num_classes=len(LABELS)
    )
    state = load_file(str(checkpoint or MODEL_DIR / "model.safetensors"))
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
        raise ValueError(f"Unexpected EfficientNet-B2 checkpoint keys: {result}")
    return model
