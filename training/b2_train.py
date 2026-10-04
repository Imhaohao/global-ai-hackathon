"""Run the unchanged B1 training engine in a private B2 module namespace."""

import importlib.util
import json
from collections import Counter

import torch

from b2_model import B2Dataset, LABELS, MANIFEST, MODEL_DIR, ROOT, RUN, SEED
from b2_model import download_pretrained, load_model, sha256


def private_module(filename, name):
    specification = importlib.util.spec_from_file_location(name, ROOT / filename)
    if specification is None or specification.loader is None:
        raise RuntimeError(f"Cannot load the existing training module: {filename}")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def configured_engine():
    engine = private_module("b1_train.py", "_efficientnet_b2_training_engine")
    engine.RUN, engine.MODEL_DIR, engine.MANIFEST = RUN, MODEL_DIR, MANIFEST
    engine.B1Dataset = B2Dataset
    engine.load_model = load_model
    engine.download_pretrained = download_pretrained
    return engine


def protected_identities():
    paths = [
        "b1_model.py",
        "b1_train.py",
        "b1_verify.py",
        "runs/efficientnet/best.safetensors",
        "runs/efficientnet_b1/best.safetensors",
    ]
    return {path: sha256(ROOT / path) for path in paths}


def recipe():
    return {
        "head": {
            "training_images": 20311,
            "validation_images": 5294,
            "optimizer": "AdamW",
            "learning_rate": 0.001,
            "weight_decay": 0.01,
            "label_smoothing": 0.05,
            "dropout": 0.15,
            "maximum_epochs": 30,
            "patience": 5,
            "minimum_epochs": 10,
            "minimum_selection_improvement": 0.002,
            "selection": "0.65 mean-source F1 + 0.20 macro F1 + 0.15 weak-class F1",
        },
        "backbone": {
            "trainable": "Last two blocks, convolutional head, and classifier",
            "frozen_batch_norm": True,
            "optimizer": "AdamW",
            "learning_rate": 0.00003,
            "weight_decay": 0.03,
            "label_smoothing": 0.05,
            "dropout": 0.15,
            "gradient_clip": 1.0,
            "maximum_epochs": 6,
            "patience": 2,
            "minimum_selection_improvement": 0.002,
            "sampling": "Same grouped parent rotation and weak-class replay as B1",
            "augmentation": "70% canonical and 30% full-target scale views at 65-100%",
            "selection": "0.5 source F1 + 0.3 far F1 + 0.2 full-context F1",
            "weak_class_guard": "Each weak class allows at most 1pp loss from the head",
        },
        "context_geometry": (
            "Full supplied annotated context contained in a 224-pixel canvas; "
            "no subsequent center crop during context training or validation"
        ),
        "teacher": "B2 learns dataset labels independently; no model teacher targets",
    }


def validate_existing_run(identity):
    path = RUN / "run_identity.json"
    if path.exists() and json.loads(path.read_text()) != identity:
        raise ValueError(
            "Existing B2 run uses different weights, data, or training code"
        )
    path.write_text(json.dumps(identity, indent=2))


def completed_report():
    path = RUN / "training.json"
    if not path.exists():
        return None
    report = json.loads(path.read_text())
    if report["status"] != "complete":
        return None
    identity = report["shared_engine_identity"]
    expected = {
        "architecture": "efficientnet_b2",
        "seed": SEED,
        "input_size": 224,
        "manifest_sha256": sha256(MANIFEST),
        "pretrained_sha256": sha256(MODEL_DIR / "model.safetensors"),
        "engine_sha256": sha256(ROOT / "b1_train.py"),
        "dataset_code_sha256": sha256(ROOT / "b1_model.py"),
    }
    checks = {
        "recipe identity": all(
            identity.get(key) == value for key, value in expected.items()
        ),
        "saved execution identity": json.loads((RUN / "run_identity.json").read_text())
        == identity,
        "architecture": report["architecture"] == "efficientnet_b2",
        "label order": report["labels"] == LABELS,
        "checkpoint": report["checkpoint_sha256"] == sha256(RUN / "best.safetensors"),
        "calibration": report["temperature"]
        == json.loads((RUN / "temperature.json").read_text()),
        "protected files": protected_identities()
        == report["protected_b0_b1_identities"],
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise ValueError(f"Completed B2 run failed identity checks: {failed}")
    return report


def initial_report(model, rows, provenance, identity):
    return {
        "architecture": "efficientnet_b2",
        "input_size": 224,
        "labels": LABELS,
        "seed": SEED,
        "parameters": sum(parameter.numel() for parameter in model.parameters()),
        "pretrained": provenance,
        "manifest_sha256": sha256(MANIFEST),
        "split_counts": dict(Counter(row["split"] for row in rows)),
        "test_used_for_selection": False,
        "external_used_for_training_or_selection": False,
        "recipe": recipe(),
        "shared_engine_identity": identity,
        "protected_b0_b1_identities": protected_identities(),
        "comparison_limits": (
            "B2 and B1 use the same vetted data, split, seed, augmentation, "
            "training algorithm, and 224-pixel app input. Their official "
            "ImageNet initializations and native pretraining resolutions differ. "
            "B0 also used different coffee pretraining and an earlier dataset. "
            "These results compare trained app models, not architecture alone."
        ),
        "status": "feature_extraction",
    }


def main():
    completed = completed_report()
    if completed is not None:
        print(
            json.dumps(
                {
                    "status": "already_complete",
                    "identities_verified": True,
                    "selected_epoch": completed["selected_epoch"],
                    "checkpoint_sha256": completed["checkpoint_sha256"],
                }
            ),
            flush=True,
        )
        return
    engine = configured_engine()
    engine.initialize()
    provenance = download_pretrained()
    identity = {
        "architecture": "efficientnet_b2",
        "seed": SEED,
        "input_size": 224,
        "manifest_sha256": sha256(MANIFEST),
        "pretrained_sha256": sha256(MODEL_DIR / "model.safetensors"),
        "engine_sha256": sha256(ROOT / "b1_train.py"),
        "dataset_code_sha256": sha256(ROOT / "b1_model.py"),
        "wrapper_sha256": sha256(ROOT / "b2_train.py"),
    }
    validate_existing_run(identity)
    rows = [
        row
        for row in json.loads(MANIFEST.read_text())["images"]
        if row["split"] in {"train", "val"}
    ]
    engine.write_json(
        RUN / "selected_validation_rows.json",
        {
            "manifest_sha256": sha256(MANIFEST),
            "preprocessing": "Shared B0/B1 bicubic resize256, center224, ImageNet normalization",
            "rows": [row for row in rows if row["split"] == "val"],
        },
    )
    model = load_model().to(memory_format=torch.channels_last)
    report = initial_report(model, rows, provenance, identity)
    engine.write_json(RUN / "training.json", report)
    print(json.dumps(report), flush=True)
    if (RUN / "head.safetensors").exists():
        model = load_model(RUN / "head.safetensors").to(
            memory_format=torch.channels_last
        )
        report["head_history"] = json.loads((RUN / "head_training.json").read_text())
    else:
        features, labels = engine.extract_features(model, rows)
        report["head_history"] = engine.train_head(model, features, labels, rows)
    state = engine.train_backbone(model, rows, report)
    report["backbone_history"] = state["history"]
    engine.finish(report, state)
    if protected_identities() != report["protected_b0_b1_identities"]:
        raise ValueError("Protected B0/B1 files changed during B2 training")


if __name__ == "__main__":
    main()
