"""Conservative scale augmentation and validation-selected continued fine-tuning."""

import copy
import hashlib
import json
import random
import time
from collections import defaultdict

import numpy as np
import torch
from PIL import Image, ImageOps
from safetensors.torch import save_file
from sklearn.metrics import accuracy_score, f1_score, log_loss
from torchvision import transforms

from model_utils import ROOT, LABELS, initialize_runtime, load_model, image_transform

RUN = ROOT / "runs/scale_v2"
BASE = ROOT / "runs/efficientnet/best.safetensors"
SEED = 20261003
OLD_SOURCES = {
    "agml",
    "beans",
    "bracol_leaf",
    "bracol_symptom",
    "coffeeleaf_own_field",
    "coffeeleaf_rust_and_leaf_miner",
    "rocole",
}


def scale_view(image, fraction):
    side = max(64, int(224 * fraction))
    fitted = ImageOps.contain(image, (side, side), Image.Resampling.BICUBIC)
    corners = np.array(image.resize((8, 8)), dtype=np.float32)
    fill = tuple(np.median(corners.reshape(-1, 3), axis=0).astype("uint8").tolist())
    canvas = Image.new("RGB", (224, 224), fill)
    canvas.paste(fitted, ((224 - fitted.width) // 2, (224 - fitted.height) // 2))
    return canvas


class ScaleDataset(torch.utils.data.Dataset):
    def __init__(self, records, mode="clean"):
        self.records, self.mode = records, mode
        self.canonical = image_transform()
        self.jitter = transforms.ColorJitter(0.12, 0.12, 0.12, 0.02)
        cfg = json.loads((ROOT / "models/huyt/config.json").read_text())[
            "pretrained_cfg"
        ]
        self.normalize = transforms.Compose(
            [transforms.ToTensor(), transforms.Normalize(cfg["mean"], cfg["std"])]
        )

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        row = self.records[index]
        path = row["path"]
        if self.mode == "context" or (self.mode == "train" and random.random() < 0.5):
            path = row.get("context_path", path)
        with Image.open(ROOT / path) as original:
            image = original.convert("RGB")
        if self.mode in ["clean", "context"]:
            tensor = self.canonical(image)
        elif self.mode == "far":
            tensor = self.normalize(scale_view(image, 0.65))
        else:
            tensor = self.augment(image)
        return (
            tensor,
            LABELS.index(row["label"]),
            row["source"] in OLD_SOURCES,
        )

    def augment(self, image):
        if random.random() < 0.5:
            image = ImageOps.mirror(image)
        if random.random() < 0.3:
            image = ImageOps.flip(image)
        image = self.jitter(image)
        if random.random() < 0.35:
            return self.canonical(image)
        return self.normalize(scale_view(image, random.uniform(0.65, 1.0)))


def predict(model, records, mode="clean"):
    outputs = []
    model.eval()
    with torch.inference_mode():
        for images, _, _ in torch.utils.data.DataLoader(
            ScaleDataset(records, mode), batch_size=32, num_workers=0
        ):
            outputs.append(model(images.to(memory_format=torch.channels_last)).cpu())
    return torch.cat(outputs).numpy()


def source_score(logits, rows):
    y = np.array([LABELS.index(r["label"]) for r in rows])
    predictions = logits.argmax(1)
    scores = {}
    for source in sorted({r["source"] for r in rows}):
        mask = np.array([r["source"] == source for r in rows])
        scores[source] = float(
            f1_score(
                y[mask],
                predictions[mask],
                labels=np.unique(y[mask]),
                average="macro",
                zero_division=0,
            )
        )
    return float(np.mean(list(scores.values()))), scores


def probe_rows(rows):
    by_source_label = defaultdict(list)
    for row in rows:
        by_source_label[(row["source"], row["label"])].append(row)
    rng = np.random.default_rng(SEED)
    result = []
    for key, values in sorted(by_source_label.items()):
        result.extend(
            values[int(i)]
            for i in rng.choice(len(values), min(30, len(values)), replace=False)
        )
    return result


def validation(model, rows, probes):
    clean = predict(model, rows)
    far = predict(model, probes, "far")
    contexts = [r for r in probes if "context_path" in r]
    wide = predict(model, contexts, "context")
    mean, sources = source_score(clean, rows)
    far_score, _ = source_score(far, probes)
    context_score, _ = source_score(wide, contexts)
    y = np.array([LABELS.index(r["label"]) for r in rows])
    old = np.array([r["source"] in OLD_SOURCES for r in rows])
    prediction = clean.argmax(1)
    f1 = f1_score(
        y[old], prediction[old], labels=list(range(8)), average=None, zero_division=0
    )
    supported = old & (y < 5)
    probabilities = torch.tensor(clean).softmax(1).numpy()
    result = dict(
        source_macro_f1=mean,
        per_source=sources,
        far_macro_f1=far_score,
        context_macro_f1=context_score,
        old_macro_f1=float(f1.mean()),
        old_native_accuracy=float(accuracy_score(y[supported], prediction[supported])),
        weak_macro_f1=float(f1[[0, 1, 5]].mean()),
        old_class_f1=dict(zip(LABELS, map(float, f1))),
        validation_loss=float(log_loss(y, probabilities, labels=list(range(8)))),
    )
    result["selection_score"] = 0.5 * mean + 0.3 * far_score + 0.2 * context_score
    return result, clean


def eligible(metrics, base):
    return (
        metrics["old_macro_f1"] >= base["old_macro_f1"] - 0.01
        and metrics["old_native_accuracy"] >= base["old_native_accuracy"] - 0.01
        and metrics["weak_macro_f1"] >= base["weak_macro_f1"] - 0.01
        and metrics["far_macro_f1"] >= base["far_macro_f1"] + 0.015
        and metrics["source_macro_f1"] >= base["source_macro_f1"] + 0.01
    )


def epoch_rows(records, epoch):
    groups = defaultdict(list)
    for row in records:
        if row["split"] == "train":
            groups[(row["group"], row["label"])].append(row)
    rng = np.random.default_rng(SEED + epoch)
    return [
        rows[int(i)]
        for rows in groups.values()
        for i in rng.choice(
            len(rows),
            min(4 if rows[0]["source"] == "peru" else 1, len(rows)),
            replace=False,
        )
    ]


def train_epoch(
    model, teacher, optimizer, rows, dataset_class=ScaleDataset, teacher_weight=0.15
):
    counts = (
        torch.bincount(
            torch.tensor([LABELS.index(r["label"]) for r in rows]), minlength=8
        )
        .float()
        .clamp_min(1)
    )
    weights = counts.rsqrt()
    weights = (weights / weights.mean()).clamp(0.4, 3)
    criterion = torch.nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)
    loader = torch.utils.data.DataLoader(
        dataset_class(rows, "train"), batch_size=24, shuffle=True, num_workers=0
    )
    model.eval()
    losses = []
    for index, (images, y, old) in enumerate(loader):
        images = images.to(memory_format=torch.channels_last)
        optimizer.zero_grad()
        features = model.forward_head(model.forward_features(images), pre_logits=True)
        logits = model.classifier(
            torch.nn.functional.dropout(features, p=0.15, training=True)
        )
        loss = criterion(logits, y)
        with torch.no_grad():
            targets = teacher(images).softmax(1)
        confident = (
            old & (targets.argmax(1) == y) & (targets.max(1).values >= 0.8) & (y != 5)
        )
        if confident.any():
            loss = loss + teacher_weight * torch.nn.functional.kl_div(
                logits[confident].log_softmax(1),
                targets[confident],
                reduction="batchmean",
            )
        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            [p for p in model.parameters() if p.requires_grad], 1.0
        )
        optimizer.step()
        losses.append(float(loss.detach()))
        if index % 75 == 0:
            print("Training", index * 24, "/", len(rows), flush=True)
    return float(np.mean(losses))


def main(settings=None):
    settings = settings or {}
    run = settings.get("run", RUN)
    manifest = settings.get("manifest", ROOT / "data/scale_v2_manifest.json")
    manifest_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()
    sample = settings.get("sampler", epoch_rows)
    dataset_class = settings.get("dataset_class", ScaleDataset)
    qualify = settings.get("qualify", eligible)
    initialize_runtime()
    torch.manual_seed(SEED)
    random.seed(SEED)
    np.random.seed(SEED)
    run.mkdir(parents=True, exist_ok=True)
    records = json.loads(manifest.read_text())["images"]
    val = [r for r in records if r["split"] == "val"]
    probes = probe_rows(val)
    model = load_model(BASE).to(memory_format=torch.channels_last).eval()
    teacher = load_model(BASE).to(memory_format=torch.channels_last).eval()
    for p in teacher.parameters():
        p.requires_grad_(False)
    for name, p in model.named_parameters():
        p.requires_grad_(
            name.startswith(
                ("blocks.5.", "blocks.6.", "conv_head.", "bn2.", "classifier.")
            )
        )
    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=settings.get("learning_rate", 1e-5),
        weight_decay=0.03,
    )
    baseline, _ = validation(model, val, probes)
    print("Baseline", json.dumps(baseline), flush=True)
    best = copy.deepcopy(model.state_dict())
    best_score = baseline["selection_score"]
    best_epoch = 0
    best_monitor = best_score
    stale = 0
    history = []
    for epoch in range(1, settings.get("max_epochs", 6) + 1):
        rows = sample(records, epoch)
        started = time.perf_counter()
        loss = train_epoch(
            model,
            teacher,
            optimizer,
            rows,
            dataset_class,
            settings.get("teacher_weight", 0.15),
        )
        metrics, logits = validation(model, val, probes)
        metrics.update(
            epoch=epoch,
            training_loss=loss,
            training_examples=len(rows),
            seconds=time.perf_counter() - started,
            eligible=qualify(metrics, baseline),
        )
        history.append(metrics)
        print("Epoch", json.dumps(metrics), flush=True)
        if metrics["eligible"] and metrics["selection_score"] > best_score + 0.002:
            best_score = metrics["selection_score"]
            best = copy.deepcopy(model.state_dict())
            best_epoch = epoch
            save_file(
                {k: v.contiguous() for k, v in best.items()},
                str(run / "candidate.safetensors"),
            )
            np.savez(
                run / "selected_validation.npz",
                logits=logits,
                labels=[LABELS.index(r["label"]) for r in val],
            )
        if metrics["selection_score"] > best_monitor + 0.002:
            best_monitor = metrics["selection_score"]
            stale = 0
        else:
            stale += 1
        report = dict(
            seed=SEED,
            manifest_sha256=manifest_hash,
            baseline_checkpoint_sha256=hashlib.sha256(BASE.read_bytes()).hexdigest(),
            experiment=settings.get("description", "Scale v2"),
            learning_rate=settings.get("learning_rate", 1e-5),
            max_epochs=settings.get("max_epochs", 6),
            teacher_weight=settings.get("teacher_weight", 0.15),
            baseline=baseline,
            history=history,
            selected_epoch=best_epoch,
            selected_score=best_score,
            selection="50% mean per-source clean F1 +30% far-view F1 +20% annotated-context F1. Require >=1.5pp far gain, >=1pp source gain, <=1pp old macro/native/weak-class regression.",
            regularization="Frozen BatchNorm, last two blocks only, AdamW wd0.03, dropout0.15, label smoothing0.05, correct confident old-model regularization, grouped sampling, early-stop patience2 improvement0.002. Run-specific parameters recorded separately.",
            test_used_for_selection=False,
        )
        assert hashlib.sha256(manifest.read_bytes()).hexdigest() == manifest_hash
        (run / "training.json").write_text(json.dumps(report, indent=2))
        if stale >= 2:
            print("Early stopping: validation stopped improving", flush=True)
            break
    print("Selected epoch", best_epoch, flush=True)


if __name__ == "__main__":
    main()
