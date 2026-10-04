"""Pinned B3 weights with the existing project's dataset and preprocessing."""

import importlib.util
import json
import sys
from pathlib import Path

PROJECT = Path(r"C:\Users\leeco\Desktop\global-ai-hackathon")
ROOT = PROJECT / "training"
HOME = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT))

import timm  # noqa: E402
from safetensors.torch import load_file  # noqa: E402
from b1_model import B1Dataset, MEAN, STD, sha256  # noqa: E402
from model_utils import LABELS  # noqa: E402

RUN = HOME / "run"
MODEL_DIR = HOME / "pretrained"
MANIFEST = ROOT / "data/scale_v3_manifest.json"
REPOSITORY = "timm/efficientnet_b3.ra2_in1k"
REVISION = "0366a75518620e0f2077789202073759f2d61393"
PRETRAINED_SHA256 = "279d2a53898aa89dab43fd6bd7df9f706aea4cb9cf916223988bbcb8e5850469"
B3Dataset = B1Dataset


def private_module(filename, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load project module: {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def download_pretrained():
    import urllib.request

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name in ["config.json", "model.safetensors", "README.md"]:
        path = MODEL_DIR / name
        if path.exists():
            continue
        url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}"
        with urllib.request.urlopen(url, timeout=120) as response:
            temporary = path.with_suffix(path.suffix + ".partial")
            with temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            temporary.replace(path)
    if sha256(MODEL_DIR / "model.safetensors") != PRETRAINED_SHA256:
        raise ValueError("Pinned B3 weight checksum mismatch")
    config = json.loads((MODEL_DIR / "config.json").read_text())
    assert config["architecture"] == "efficientnet_b3"
    assert config["pretrained_cfg"]["mean"] == MEAN
    assert config["pretrained_cfg"]["std"] == STD
    metadata = dict(
        repository=REPOSITORY,
        revision=REVISION,
        license="apache-2.0",
        pretraining="ImageNet-1k; no coffee disease head reused",
        source=f"https://huggingface.co/{REPOSITORY}/tree/{REVISION}",
        native_pretraining_resolution=288,
        published_test_resolution=320,
        fine_tuning_and_app_resolution=224,
        resolution_note="Same 224-pixel app contract as B0/B1/B2; not the published 320-pixel B3 test setting.",
        sha256={
            name: sha256(MODEL_DIR / name)
            for name in ["config.json", "model.safetensors"]
        },
    )
    (MODEL_DIR / "provenance.json").write_text(json.dumps(metadata, indent=2))
    return metadata


def load_model(checkpoint=None):
    model = timm.create_model(
        "efficientnet_b3", pretrained=False, num_classes=len(LABELS)
    )
    state = load_file(str(checkpoint or MODEL_DIR / "model.safetensors"))
    if checkpoint:
        model.load_state_dict(state, strict=True)
        return model
    state.pop("classifier.weight")
    state.pop("classifier.bias")
    result = model.load_state_dict(state, strict=False)
    assert set(result.missing_keys) == {"classifier.weight", "classifier.bias"}
    assert not result.unexpected_keys
    return model
