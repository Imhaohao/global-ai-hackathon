"""Train B1 using only vetted grouped training and validation records."""

import copy
import json
import random
import time
from collections import Counter

import numpy as np
import torch
from safetensors.torch import save_file
from scipy.optimize import minimize_scalar
from sklearn.metrics import f1_score

from b1_model import (
    B1Dataset,
    LABELS,
    MANIFEST,
    MODEL_DIR,
    ROOT,
    RUN,
    SEED,
    download_pretrained,
    load_model,
    sha256,
)
from train_scale import OLD_SOURCES, probe_rows, source_score
from train_scale_balanced import sampled_rows


def write_json(path, value):
    temporary = path.with_suffix(".json.partial")
    temporary.write_text(json.dumps(value, indent=2))
    temporary.replace(path)


def save_checkpoint(model, filename):
    temporary = RUN / (filename + ".partial")
    save_file(
        {key: value.detach().contiguous() for key, value in model.state_dict().items()},
        str(temporary),
    )
    temporary.replace(RUN / filename)


def initialize():
    torch.set_num_threads(8)
    torch.set_num_interop_threads(1)
    torch.manual_seed(SEED)
    random.seed(SEED)
    np.random.seed(SEED)
    RUN.mkdir(parents=True, exist_ok=True)


def class_weights(labels):
    counts = torch.bincount(labels, minlength=len(LABELS)).float().clamp_min(1)
    weights = counts.rsqrt()
    return (weights / weights.mean()).clamp(0.4, 3)


def feature_identity(rows):
    import hashlib

    digest = hashlib.sha256()
    digest.update(sha256(MANIFEST).encode())
    digest.update(sha256(MODEL_DIR / "model.safetensors").encode())
    digest.update(repr(B1Dataset([]).canonical).encode())
    for row in rows:
        digest.update(row["path"].encode())
        digest.update(sha256(ROOT / row["path"]).encode())
    return digest.hexdigest()


def extract_features(model, rows):
    path = RUN / "features.pt"
    identity = feature_identity(rows)
    if path.exists():
        saved = torch.load(path, weights_only=True)
        if saved["identity"] == identity:
            return saved["features"], saved["labels"]
    features, labels = [], []
    started = time.perf_counter()
    loader = torch.utils.data.DataLoader(B1Dataset(rows), batch_size=32, num_workers=0)
    model.eval()
    with torch.inference_mode():
        for batch, (images, target) in enumerate(loader):
            images = images.to(memory_format=torch.channels_last)
            values = model.forward_head(model.forward_features(images), pre_logits=True)
            features.append(values.clone())
            labels.append(target)
            if batch % 50 == 0:
                print(
                    json.dumps(
                        {
                            "stage": "features",
                            "images": min((batch + 1) * 32, len(rows)),
                            "total": len(rows),
                            "seconds": round(time.perf_counter() - started),
                        }
                    ),
                    flush=True,
                )
    features, labels = torch.cat(features), torch.cat(labels)
    torch.save(
        {
            "identity": identity,
            "features": features,
            "labels": labels,
            "paths": [r["path"] for r in rows],
        },
        path,
    )
    return features, labels


def clean_metrics(logits, rows):
    y = np.array([LABELS.index(row["label"]) for row in rows])
    prediction = logits.argmax(1)
    f1 = f1_score(y, prediction, labels=list(range(8)), average=None, zero_division=0)
    source_mean, per_source = source_score(logits, rows)
    old = np.array([row["source"] in OLD_SOURCES for row in rows])
    old_f1 = f1_score(
        y[old], prediction[old], labels=list(range(8)), average=None, zero_division=0
    )
    return {
        "accuracy": float(np.mean(y == prediction)),
        "macro_f1": float(f1.mean()),
        "source_macro_f1": source_mean,
        "per_source": per_source,
        "weak_macro_f1": float(old_f1[[0, 1, 5]].mean()),
        "old_class_f1": dict(zip(LABELS, map(float, old_f1))),
        "old_native_accuracy": float(
            np.mean(prediction[old & (y < 5)] == y[old & (y < 5)])
        ),
    }


def train_head(model, features, labels, rows):
    train = torch.tensor([i for i, row in enumerate(rows) if row["split"] == "train"])
    val = torch.tensor([i for i, row in enumerate(rows) if row["split"] == "val"])
    validation = [rows[int(i)] for i in val]
    optimizer = torch.optim.AdamW(
        model.classifier.parameters(), lr=1e-3, weight_decay=0.01
    )
    criterion = torch.nn.CrossEntropyLoss(
        weight=class_weights(labels[train]), label_smoothing=0.05
    )
    best_score, stale, history = -1.0, 0, []
    best = copy.deepcopy(model.classifier.state_dict())
    for epoch in range(1, 31):
        order = train[torch.randperm(len(train))]
        for indices in order.split(128):
            optimizer.zero_grad()
            values = torch.nn.functional.dropout(
                features[indices], p=0.15, training=True
            )
            loss = criterion(model.classifier(values), labels[indices])
            loss.backward()
            optimizer.step()
        with torch.no_grad():
            logits = model.classifier(features[val]).numpy()
        metrics = clean_metrics(logits, validation)
        score = (
            0.65 * metrics["source_macro_f1"]
            + 0.20 * metrics["macro_f1"]
            + 0.15 * metrics["weak_macro_f1"]
        )
        metrics.update(stage="head", epoch=epoch, selection_score=score)
        history.append(metrics)
        print(json.dumps(metrics), flush=True)
        if score > best_score + 0.002:
            best_score, best, stale = (
                score,
                copy.deepcopy(model.classifier.state_dict()),
                0,
            )
        else:
            stale += 1
        if epoch >= 10 and stale >= 5:
            break
    model.classifier.load_state_dict(best)
    save_checkpoint(model, "head.safetensors")
    write_json(RUN / "head_training.json", history)
    return history


def predict(model, rows, mode="clean"):
    values = []
    model.eval()
    with torch.inference_mode():
        for images, _ in torch.utils.data.DataLoader(
            B1Dataset(rows, mode), batch_size=32, num_workers=0
        ):
            values.append(model(images.to(memory_format=torch.channels_last)).clone())
    return torch.cat(values).numpy()


def validate(model, rows, probes):
    logits = predict(model, rows)
    metrics = clean_metrics(logits, rows)
    far = predict(model, probes, "far")
    context_rows = [row for row in probes if "context_path" in row]
    context = predict(model, context_rows, "context")
    metrics["far_macro_f1"] = source_score(far, probes)[0]
    metrics["context_macro_f1"] = source_score(context, context_rows)[0]
    metrics["selection_score"] = (
        0.5 * metrics["source_macro_f1"]
        + 0.3 * metrics["far_macro_f1"]
        + 0.2 * metrics["context_macro_f1"]
    )
    return metrics, logits


def training_epoch(model, optimizer, rows):
    targets = torch.tensor([LABELS.index(row["label"]) for row in rows])
    criterion = torch.nn.CrossEntropyLoss(
        weight=class_weights(targets), label_smoothing=0.05
    )
    loader = torch.utils.data.DataLoader(
        B1Dataset(rows, "train"), batch_size=24, shuffle=True, num_workers=0
    )
    model.eval()
    losses = []
    for batch, (images, labels) in enumerate(loader):
        optimizer.zero_grad()
        features = model.forward_head(
            model.forward_features(images.to(memory_format=torch.channels_last)),
            pre_logits=True,
        )
        logits = model.classifier(
            torch.nn.functional.dropout(features, p=0.15, training=True)
        )
        loss = criterion(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            [p for p in model.parameters() if p.requires_grad], 1.0
        )
        optimizer.step()
        losses.append(float(loss.detach()))
        if batch % 50 == 0:
            print(
                json.dumps(
                    {
                        "stage": "backbone",
                        "images": min((batch + 1) * 24, len(rows)),
                        "total": len(rows),
                        "loss": float(np.mean(losses)),
                    }
                ),
                flush=True,
            )
    return float(np.mean(losses))


def preserves_weak_classes(metrics, baseline):
    return all(
        metrics["old_class_f1"][label] >= baseline["old_class_f1"][label] - 0.01
        for label in ["cercospora", "healthy", "red_spider_mite"]
    )


def save_resume(model, optimizer, state):
    temporary = RUN / "resume.pt.partial"
    torch.save(
        {
            "model": model.state_dict(),
            "optimizer": optimizer.state_dict(),
            "state": state,
            "torch_rng": torch.get_rng_state(),
            "python_rng": random.getstate(),
        },
        temporary,
    )
    temporary.replace(RUN / "resume.pt")


def restore_resume(model, optimizer, baseline):
    path = RUN / "resume.pt"
    if not path.exists():
        return {
            "epoch": 0,
            "selected_epoch": 0,
            "best_score": baseline["selection_score"],
            "monitor": baseline["selection_score"],
            "stale": 0,
            "history": [],
        }
    saved = torch.load(path, weights_only=True)
    model.load_state_dict(saved["model"])
    optimizer.load_state_dict(saved["optimizer"])
    torch.set_rng_state(saved["torch_rng"])
    random.setstate(saved["python_rng"])
    return saved["state"]


def update_state(state, metrics, model, logits, rows):
    score = metrics["selection_score"]
    if metrics["eligible"] and score > state["best_score"] + 0.002:
        state.update(best_score=score, selected_epoch=metrics["epoch"])
        save_checkpoint(model, "best.safetensors")
        np.savez(
            RUN / "selected_validation.npz",
            logits=logits,
            labels=[LABELS.index(row["label"]) for row in rows],
            paths=[row["path"] for row in rows],
        )
    if score > state["monitor"] + 0.002:
        state.update(monitor=score, stale=0)
    else:
        state["stale"] += 1
    state["epoch"] = metrics["epoch"]
    state["history"].append(metrics)


def train_backbone(model, rows, report):
    val = [row for row in rows if row["split"] == "val"]
    probes = probe_rows(val)
    for name, parameter in model.named_parameters():
        parameter.requires_grad_(
            name.startswith(
                ("blocks.5.", "blocks.6.", "conv_head.", "bn2.", "classifier.")
            )
        )
    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad], lr=3e-5, weight_decay=0.03
    )
    baseline, logits = validate(model, val, probes)
    print("Head baseline " + json.dumps(baseline), flush=True)
    report["head_baseline"] = baseline
    if not (RUN / "best.safetensors").exists():
        save_checkpoint(model, "best.safetensors")
        np.savez(
            RUN / "selected_validation.npz",
            logits=logits,
            labels=[LABELS.index(row["label"]) for row in val],
            paths=[row["path"] for row in val],
        )
    state = restore_resume(model, optimizer, baseline)
    for epoch in range(state["epoch"] + 1, 7):
        if state["stale"] >= 2:
            break
        started = time.perf_counter()
        sample = sampled_rows(rows, epoch)
        loss = training_epoch(model, optimizer, sample)
        metrics, logits = validate(model, val, probes)
        metrics.update(
            stage="partial_backbone",
            epoch=epoch,
            training_loss=loss,
            training_examples=len(sample),
            seconds=time.perf_counter() - started,
            eligible=preserves_weak_classes(metrics, baseline),
        )
        update_state(state, metrics, model, logits, val)
        save_checkpoint(model, "last.safetensors")
        save_resume(model, optimizer, state)
        report.update(
            backbone_history=state["history"],
            selected_epoch=state["selected_epoch"],
            selected_score=state["best_score"],
            status="training",
        )
        write_json(RUN / "training.json", report)
        print("Epoch " + json.dumps(metrics), flush=True)
    return state


def finish(report, state):
    saved = np.load(RUN / "selected_validation.npz")
    logits, labels = (
        torch.tensor(saved["logits"]),
        torch.tensor(saved["labels"], dtype=torch.long),
    )
    result = minimize_scalar(
        lambda temperature: float(
            torch.nn.functional.cross_entropy(logits / temperature, labels)
        ),
        bounds=(0.25, 5),
        method="bounded",
    )
    calibration = {
        "temperature": float(result.x),
        "validation_n": len(labels),
        "source": "scale_v3 validation only",
        "test_used": False,
    }
    write_json(RUN / "temperature.json", calibration)
    report.update(
        status="complete",
        selected_epoch=state["selected_epoch"],
        selected_score=state["best_score"],
        checkpoint_sha256=sha256(RUN / "best.safetensors"),
        temperature=calibration,
    )
    assert sha256(MANIFEST) == report["manifest_sha256"]
    write_json(RUN / "training.json", report)
    print(
        "Training complete "
        + json.dumps(
            {
                "checkpoint": str(RUN / "best.safetensors"),
                "selected_epoch": state["selected_epoch"],
                "temperature": calibration["temperature"],
            }
        ),
        flush=True,
    )


def main():
    initialize()
    provenance = download_pretrained()
    all_rows = json.loads(MANIFEST.read_text())["images"]
    rows = [row for row in all_rows if row["split"] in {"train", "val"}]
    write_json(
        RUN / "selected_validation_rows.json",
        {
            "manifest_sha256": sha256(MANIFEST),
            "preprocessing": (
                "Shared B0 bicubic resize to 256, center crop to 224, "
                "and ImageNet normalization"
            ),
            "rows": [row for row in rows if row["split"] == "val"],
        },
    )
    model = load_model().to(memory_format=torch.channels_last)
    report = {
        "architecture": "efficientnet_b1",
        "input_size": 224,
        "labels": LABELS,
        "seed": SEED,
        "parameters": sum(p.numel() for p in model.parameters()),
        "pretrained": provenance,
        "manifest_sha256": sha256(MANIFEST),
        "split_counts": dict(Counter(row["split"] for row in rows)),
        "test_used_for_selection": False,
        "external_used_for_training_or_selection": False,
        "recipe": {
            "head": (
                "All 20,311 vetted training images and 5,294 validation images; "
                "pretrained feature extraction; weighted AdamW lr 0.001, "
                "weight decay 0.01, label smoothing 0.05, dropout 0.15; "
                "maximum 30 epochs, patience 5 after epoch 10; selection uses "
                "0.65 mean-source F1 + 0.20 macro F1 + 0.15 weak-class F1"
            ),
            "backbone": (
                "Last two blocks and head only; frozen BatchNorm; grouped "
                "parent rotation with weak-class replay; AdamW lr 0.00003, "
                "weight decay 0.03, smoothing 0.05, dropout 0.15, gradient "
                "clip 1; maximum 6 epochs, patience 2, improvement 0.002; "
                "70% canonical and 30% full-target scales of 65-100%; "
                "selection uses 0.5 source F1 + 0.3 far F1 + 0.2 context F1; "
                "retain the head checkpoint without an eligible gain; each "
                "weak class allows at most 1pp regression from the head"
            ),
            "context_geometry": (
                "Full supplied annotated context contained in a 224 canvas "
                "without a subsequent center crop; both context training "
                "and context validation preserve the supplied target region"
            ),
            "teacher": (
                "B1 independently learns dataset labels; B0 probabilities "
                "are not used as training targets"
            ),
        },
        "comparison_limits": (
            "B0 started from coffee fine-tuning and used the original datasets; "
            "B1 starts from ImageNet and includes reviewed BRACOL and Peru. "
            "The outcome compares deployable models, not architecture alone."
        ),
        "status": "feature_extraction",
    }
    write_json(RUN / "training.json", report)
    print(json.dumps(report), flush=True)
    if (RUN / "head.safetensors").exists():
        model = load_model(RUN / "head.safetensors").to(
            memory_format=torch.channels_last
        )
        report["head_history"] = json.loads((RUN / "head_training.json").read_text())
    else:
        features, labels = extract_features(model, rows)
        report["head_history"] = train_head(model, features, labels, rows)
    state = train_backbone(model, rows, report)
    finish(report, state)


if __name__ == "__main__":
    main()
