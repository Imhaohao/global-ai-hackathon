import argparse
import copy
import hashlib
import json
import time

import numpy as np
import torch
from model_utils import (
    LABELS,
    ROOT,
    SEED,
    LeafDataset,
    initialize_runtime,
    load_model,
    read_records,
)
from safetensors.torch import save_file
from scipy.optimize import minimize_scalar
from sklearn.metrics import classification_report, confusion_matrix, f1_score

RUN = ROOT / "runs/efficientnet"


def feature_signature(records, model):
    digest = hashlib.sha256()
    digest.update(json.dumps(records, sort_keys=True).encode())
    digest.update(repr(LeafDataset(records).transform).encode())
    for key, value in model.state_dict().items():
        digest.update(key.encode())
        digest.update(value.detach().cpu().contiguous().numpy().tobytes())
    for row in records:
        digest.update(hashlib.sha256((ROOT / row["path"]).read_bytes()).digest())
    return digest.hexdigest()


def summarize(probabilities, labels):
    prediction = probabilities.argmax(1)
    return {
        "n": len(labels),
        "accuracy": float(np.mean(prediction == labels)),
        "macro_f1": float(
            f1_score(
                labels,
                prediction,
                labels=list(range(len(LABELS))),
                average="macro",
                zero_division=0,
            )
        ),
        "classification": classification_report(
            labels,
            prediction,
            labels=list(range(len(LABELS))),
            target_names=LABELS,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(
            labels, prediction, labels=list(range(len(LABELS)))
        ).tolist(),
    }


def collect_features(model, records):
    cache = RUN / "features.pt"
    signature = feature_signature(records, model)
    if cache.exists():
        stored = torch.load(cache, weights_only=True)
        if stored.get("signature") == signature:
            return stored["features"], stored["labels"]
    loader = torch.utils.data.DataLoader(
        LeafDataset(records), batch_size=32, shuffle=False, num_workers=0
    )
    features, labels = [], []
    model.eval().to(memory_format=torch.channels_last)
    started = time.perf_counter()
    with torch.inference_mode():
        for index, (images, target) in enumerate(loader):
            value = model.forward_head(
                model.forward_features(images.to(memory_format=torch.channels_last)),
                pre_logits=True,
            )
            features.append(value.clone())
            labels.append(target)
            if index % 50 == 0:
                print(
                    "Features",
                    index * 32,
                    "/",
                    len(records),
                    "seconds",
                    round(time.perf_counter() - started),
                    flush=True,
                )
    features, labels = torch.cat(features), torch.cat(labels)
    torch.save(
        {
            "features": features,
            "labels": labels,
            "paths": [r["path"] for r in records],
            "signature": signature,
        },
        cache,
    )
    return features, labels


def train_head(model, features, labels, train_indices, val_indices, weights):
    head = model.classifier
    optimizer = torch.optim.AdamW(head.parameters(), lr=1e-3, weight_decay=0.01)
    criterion = torch.nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)
    best, best_score = copy.deepcopy(head.state_dict()), -1.0
    history = []
    for epoch in range(30):
        order = train_indices[torch.randperm(len(train_indices))]
        head.train()
        for indices in order.split(128):
            optimizer.zero_grad()
            loss = criterion(head(features[indices]), labels[indices])
            loss.backward()
            optimizer.step()
        with torch.no_grad():
            prediction = head(features[val_indices]).argmax(1).numpy()
        score = f1_score(
            labels[val_indices].numpy(), prediction, average="macro", zero_division=0
        )
        history.append(
            {"stage": "head", "epoch": epoch + 1, "val_macro_f1": float(score)}
        )
        if score > best_score:
            best_score, best = score, copy.deepcopy(head.state_dict())
        if epoch % 5 == 0:
            print("Head epoch", epoch + 1, "val macro F1", round(score, 4), flush=True)
    head.load_state_dict(best)
    return history


def predict(model, records):
    loader = torch.utils.data.DataLoader(
        LeafDataset(records), batch_size=32, num_workers=0
    )
    logits, labels = [], []
    model.eval()
    device = next(model.parameters()).device
    with torch.inference_mode():
        for images, target in loader:
            logits.append(
                model(images.to(device=device, memory_format=torch.channels_last))
                .cpu()
                .clone()
            )
            labels.append(target)
    return torch.cat(logits), torch.cat(labels)


def partial_training(model, records, weights, epochs):
    training = [r for r in records if r["split"] == "train"]
    validation = [r for r in records if r["split"] == "val"]
    parents = {}
    for row in training:
        parents.setdefault((row["parent"], row["label"]), []).append(row)
    for name, parameter in model.named_parameters():
        parameter.requires_grad_(
            name.startswith(("blocks.6.", "conv_head.", "bn2.", "classifier."))
        )
    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad], lr=3e-5, weight_decay=0.01
    )
    criterion = torch.nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)
    baseline_logits, y = predict(model, validation)
    best_score = f1_score(
        y.numpy(), baseline_logits.argmax(1).numpy(), average="macro", zero_division=0
    )
    best = copy.deepcopy(model.state_dict())
    history = []
    for epoch in range(epochs):
        selected = [rows[epoch % len(rows)] for rows in parents.values()]
        loader = torch.utils.data.DataLoader(
            LeafDataset(selected, augment=True),
            batch_size=16,
            shuffle=True,
            num_workers=0,
        )
        model.eval()
        model.classifier.train()
        started, losses = time.perf_counter(), []
        for batch, (images, target) in enumerate(loader):
            optimizer.zero_grad()
            loss = criterion(
                model(images.to(memory_format=torch.channels_last)), target
            )
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
            if batch % 75 == 0:
                print(
                    "Fine tune", epoch + 1, batch * 16, "/", len(selected), flush=True
                )
        logits, labels = predict(model, validation)
        score = f1_score(
            labels.numpy(), logits.argmax(1).numpy(), average="macro", zero_division=0
        )
        history.append(
            {
                "stage": "partial_backbone",
                "epoch": epoch + 1,
                "images": len(selected),
                "loss": float(np.mean(losses)),
                "val_macro_f1": float(score),
                "seconds": time.perf_counter() - started,
            }
        )
        print("Fine tune epoch", epoch + 1, "val F1", round(score, 4), flush=True)
        save_file(
            {k: v.contiguous() for k, v in model.state_dict().items()},
            str(RUN / "last.safetensors"),
        )
        if score > best_score:
            best_score, best = score, copy.deepcopy(model.state_dict())
    model.load_state_dict(best)
    return history


def calibrate(logits, labels):
    def objective(temperature):
        return float(torch.nn.functional.cross_entropy(logits / temperature, labels))

    result = minimize_scalar(objective, bounds=(0.25, 5), method="bounded")
    temperature = float(result.x)
    probabilities = (logits / temperature).softmax(1).numpy()
    maxprob = probabilities.max(1)
    correct = probabilities.argmax(1) == labels.numpy()
    supported = probabilities.argmax(1) < 7
    candidates = []
    for threshold in np.linspace(0.4, 0.99, 60):
        accepted = (maxprob >= threshold) & supported
        if accepted.sum() >= 30 and correct[accepted].mean() >= 0.9:
            candidates.append(float(threshold))
    threshold = min(candidates) if candidates else 1.0
    return {
        "temperature": temperature,
        "accept_threshold": threshold,
        "selection": "lowest validation threshold with at least30 accepted and90% correctness; reject unsupported class",
        "validation_n": len(labels),
    }


def source_metrics(probabilities, labels, records):
    result = {}
    for source in sorted({r["source"] for r in records}):
        indices = [i for i, r in enumerate(records) if r["source"] == source]
        result[source] = summarize(probabilities[indices], labels[indices])
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=3)
    args = parser.parse_args()
    initialize_runtime()
    RUN.mkdir(parents=True, exist_ok=True)
    records = read_records()
    model = load_model().to(memory_format=torch.channels_last)
    features, labels = collect_features(model, records)
    parts = {
        part: torch.tensor(
            [i for i, r in enumerate(records) if r["split"] == part], dtype=torch.long
        )
        for part in ["train", "val", "test", "external"]
    }
    with torch.no_grad():
        baseline = model.classifier(features).softmax(1).numpy()
    counts = (
        torch.bincount(labels[parts["train"]], minlength=len(LABELS))
        .float()
        .clamp_min(1)
    )
    weights = counts.rsqrt()
    weights /= weights.mean()
    history = train_head(model, features, labels, parts["train"], parts["val"], weights)
    save_file(
        {k: v.contiguous() for k, v in model.state_dict().items()},
        str(RUN / "head.safetensors"),
    )
    history += partial_training(model, records, weights, args.epochs)
    save_file(
        {k: v.contiguous() for k, v in model.state_dict().items()},
        str(RUN / "best.safetensors"),
    )
    validation = [r for r in records if r["split"] == "val"]
    val_logits, val_y = predict(model, validation)
    calibration = calibrate(val_logits, val_y)
    results = {
        "labels": LABELS,
        "seed": SEED,
        "architecture": "efficientnet_b0",
        "device": "cpu",
        "history": history,
        "calibration": calibration,
        "manifest_sha256": __import__("hashlib")
        .sha256((ROOT / "data/manifest.json").read_bytes())
        .hexdigest(),
        "revisions": json.loads((ROOT / "data/revisions.json").read_text()),
        "partial_sampling": "all unique images for head; rotate one crop per parent and label each backbone epoch to reduce correlated crop dominance",
    }
    for part in ["test", "external"]:
        indices = parts[part]
        if not len(indices):
            continue
        rows = [records[int(i)] for i in indices]
        logits, y = predict(model, rows)
        probabilities = (logits / calibration["temperature"]).softmax(1).numpy()
        result = {
            "baseline": summarize(baseline[indices.numpy()], y.numpy()),
            "fine_tuned": summarize(probabilities, y.numpy()),
            "per_source": source_metrics(probabilities, y.numpy(), rows),
        }
        unseen = [
            i
            for i, r in enumerate(rows)
            if not r["pretraining_exposed"] and r["source"] != "agml"
        ]
        if unseen:
            result["unseen_new_source"] = summarize(
                probabilities[unseen], y.numpy()[unseen]
            )
        accepted = (probabilities.max(1) >= calibration["accept_threshold"]) & (
            probabilities.argmax(1) < 7
        )
        result["accepted_coverage"] = float(accepted.mean())
        result["accepted_accuracy"] = (
            float(np.mean(probabilities.argmax(1)[accepted] == y.numpy()[accepted]))
            if accepted.any()
            else None
        )
        results[part] = result
        np.savez(
            RUN / f"{part}_predictions.npz",
            probabilities=probabilities,
            labels=y.numpy(),
            baseline=baseline[indices.numpy()],
        )
        print(
            part,
            "baseline",
            result["baseline"]["accuracy"],
            "fine",
            result["fine_tuned"]["accuracy"],
            flush=True,
        )
    (RUN / "results.json").write_text(json.dumps(results, indent=2))
    (RUN / "calibration.json").write_text(json.dumps(calibration, indent=2))
    print("Training complete", RUN, flush=True)


if __name__ == "__main__":
    main()
