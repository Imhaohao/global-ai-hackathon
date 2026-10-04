"""Run an isolated warm start without overwriting the imported checkpoint."""
import hashlib
import json
import math
from pathlib import Path
import random
import shutil
import time

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from transformers import SegformerForSemanticSegmentation

from hotspots.model import CLASSES, MEAN, STD, device_name, enable_mps_batchnorm_workaround
from training.train_expanded import CachedSamples, evaluate, metrics_at, save_json, select_thresholds


def file_digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def validate_fields(manifest):
    fields = {}
    for split in ("train", "val", "test"):
        ids = manifest["splits"][split]
        if not ids or len(ids) != len(set(ids)):
            raise ValueError("Each split must contain unique nonempty samples")
        fields[split] = {name.split("_")[0] for name in ids}
    for left, right in (("train", "val"), ("train", "test"), ("val", "test")):
        if fields[left] & fields[right]:
            raise ValueError("Fields overlap between " + left + " and " + right)
    return fields


def checkpoint_metadata(initial, metadata_source=None):
    initial = Path(initial)
    own_summary = initial / "training-summary.json"
    summary_path = own_summary if own_summary.is_file() else metadata_source
    if summary_path is None:
        raise ValueError("Partial checkpoint requires --metadata-source pointing to its original training-summary.json")
    summary_path = Path(summary_path)
    metadata = json.loads(summary_path.read_text())
    if metadata["classes"] != CLASSES or metadata["channels"] != ["red", "green", "blue", "nir"]:
        raise ValueError("Checkpoint metadata has incompatible classes or channels")
    config = json.loads((initial / "config.json").read_text())
    labels = [config["id2label"][str(i)] for i in range(len(CLASSES))]
    if config["num_channels"] != 4 or labels != CLASSES:
        raise ValueError("Model configuration has incompatible classes or channels")
    template_weights = summary_path.parent / "model.safetensors"
    if file_digest(template_weights) != metadata["checkpoint_sha256"]:
        raise ValueError("Metadata source does not match its model weights")
    digest = file_digest(initial / "model.safetensors")
    return metadata, {
        "initial_checkpoint_sha256": digest,
        "metadata_source": str(summary_path.resolve()),
        "metadata_source_sha256": file_digest(summary_path),
        "warm_start_from_partial_checkpoint": not own_summary.is_file(),
        "optimizer_state_restored": False,
        "scheduler_state_restored": False,
    }


def reserve_output(output, initial):
    output, initial = Path(output).resolve(), Path(initial).resolve()
    if output == initial or output.is_relative_to(initial) or initial.is_relative_to(output):
        raise ValueError("Output must be separate from the initial checkpoint")
    if output.exists():
        raise FileExistsError("Output already exists; choose a new run directory")
    output.mkdir(parents=True, exist_ok=False)
    return output


def masked_training_loss(logits, labels, valid, weights):
    bce = (F.binary_cross_entropy_with_logits(logits, labels, pos_weight=weights, reduction="none") * valid).sum()
    bce = bce / (valid.sum() * len(CLASSES)).clamp_min(1)
    prediction, target = logits.sigmoid() * valid, labels * valid
    intersection = (prediction * target).sum((0, 2, 3))
    support = target.sum((0, 2, 3))
    dice = 1 - (2 * intersection + 1) / (prediction.sum((0, 2, 3)) + support + 1)
    active = support > 0
    dice_loss = dice[active].mean() if active.any() else logits.sum() * 0
    return bce + 0.5 * dice_loss


def schedule_scale(step, warmup, total):
    if step < warmup:
        return max(0.05, (step + 1) / warmup)
    progress = (step - warmup) / max(1, total - warmup)
    return 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * progress))


def load_model(path, device):
    model = SegformerForSemanticSegmentation.from_pretrained(path, local_files_only=True).to(device)
    if device == "mps":
        enable_mps_batchnorm_workaround(model)
    return model


def validation_record(model, loader, device):
    fixed, histogram = evaluate(model, loader, device)
    thresholds, sweep = select_thresholds(histogram)
    return {"fixed_0_5": fixed, "validation_selected_thresholds": thresholds,
            "validation_at_selected_thresholds": metrics_at(histogram, thresholds), "sweep": sweep}


class ExpandedRun:
    def __init__(self, args):
        self.args = args
        self.manifest = json.loads((args.data / "sample-manifest.json").read_text())
        self.fields = validate_fields(self.manifest)
        self.metadata, self.provenance = checkpoint_metadata(args.initial, getattr(args, "metadata_source", None))
        self.reference = getattr(args, "reference", None) or args.initial
        checkpoint_metadata(self.reference, getattr(args, "metadata_source", None))
        if args.epochs < 1 or args.batch_size < 1 or args.lr <= 0:
            raise ValueError("Epochs, batch size, and learning rate must be positive")
        self.output = reserve_output(args.output, args.initial)
        self.started = time.time()
        self.device = device_name()
        self.history = []
        self.steps = 0
        self.best_epoch = 0
        self.stale = 0

    def setup(self):
        args = self.args
        random.seed(args.seed)
        np.random.seed(args.seed)
        torch.manual_seed(args.seed)
        torch.set_num_threads(getattr(args, "threads", 4))
        self.trainset = CachedSamples(args.data, "train", True)
        self.valset = CachedSamples(args.data, "val")
        self.trainloader = DataLoader(self.trainset, batch_size=args.batch_size, shuffle=True, num_workers=0)
        self.valloader = DataLoader(self.valset, batch_size=args.batch_size, num_workers=0)
        self.model = load_model(args.initial, self.device)
        self.initial_validation = validation_record(self.model, self.valloader, self.device)
        self.best = self.initial_validation["fixed_0_5"]["mean_iou_present_classes"]
        save_json(self.output / "warm-start-validation.json", self.initial_validation)
        self.model.save_pretrained(self.output, safe_serialization=True)
        self.setup_optimizer()
        self.save_provenance()
        print(json.dumps({"device": self.device, "train_tiles": len(self.trainset),
                          "baseline_validation_mean_iou": self.best, "locked_test_opened": False}), flush=True)

    def setup_optimizer(self):
        args = self.args
        stats = json.loads((args.data / "dataset-statistics.json").read_text())["train"]
        positives = torch.tensor([stats["class_positive_pixels"][c] for c in CLASSES], dtype=torch.float32)
        self.weights = torch.sqrt((stats["valid_pixels"] - positives) / positives.clamp_min(1)).clamp(1, 8)
        self.weights = self.weights.to(self.device)[None, :, None, None]
        self.optimizer = torch.optim.AdamW([
            {"params": self.model.segformer.parameters(), "lr": args.lr},
            {"params": self.model.decode_head.parameters(), "lr": args.lr * 5}], weight_decay=0.01)
        total = args.epochs * len(self.trainloader)
        warmup = min(128, len(self.trainloader))
        self.scheduler = torch.optim.lr_scheduler.LambdaLR(
            self.optimizer, lambda step: schedule_scale(step, warmup, total))

    def save_provenance(self):
        record = dict(self.provenance)
        record.update({"platform": "Windows continuation", "device": self.device,
                       "torch_version": torch.__version__, "field_counts": self.manifest["field_counts"],
                       "sample_manifest_sha256": file_digest(self.args.data / "sample-manifest.json"),
                       "reference_checkpoint_sha256": file_digest(self.reference / "model.safetensors"),
                       "arguments": {key: str(value) if isinstance(value, Path) else value
                                     for key, value in vars(self.args).items()}})
        save_json(self.output / "run-provenance.json", record)

    def train_epoch(self, epoch):
        self.model.train()
        losses = []
        for image, labels, valid in self.trainloader:
            image, labels, valid = [tensor.to(self.device) for tensor in (image, labels, valid)]
            self.optimizer.zero_grad(set_to_none=True)
            logits = F.interpolate(self.model(pixel_values=image).logits, size=labels.shape[-2:],
                                   mode="bilinear", align_corners=False)
            loss = masked_training_loss(logits, labels, valid, self.weights)
            if not torch.isfinite(loss):
                raise RuntimeError("Non-finite training loss")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()
            self.scheduler.step()
            self.steps += 1
            losses.append(float(loss.detach()))
            if self.steps % 32 == 0:
                print(json.dumps({"epoch": epoch, "steps": self.steps, "loss": losses[-1],
                                  "elapsed_seconds": time.time() - self.started}), flush=True)
        return float(np.mean(losses))

    def save_training_state(self, epoch):
        state = {"epoch": epoch, "steps": self.steps, "model": self.model.state_dict(),
                 "optimizer": self.optimizer.state_dict(), "scheduler": self.scheduler.state_dict(),
                 "torch_rng": torch.get_rng_state(), "numpy_rng": np.random.get_state(),
                 "python_rng": random.getstate(), "best_epoch": self.best_epoch,
                 "best_validation_iou": self.best, "history": self.history}
        temp = self.output / "latest-training-state.pt.partial"
        torch.save(state, temp)
        temp.replace(self.output / "latest-training-state.pt")

    def train(self):
        for epoch in range(1, self.args.epochs + 1):
            started = time.time()
            loss = self.train_epoch(epoch)
            validation, _ = evaluate(self.model, self.valloader, self.device)
            record = {"epoch": epoch, "training_loss": loss, "validation": validation,
                      "epoch_seconds": time.time() - started, "optimizer_steps": self.steps}
            self.history.append(record)
            score = validation["mean_iou_present_classes"]
            if score > self.best:
                self.best, self.best_epoch, self.stale = score, epoch, 0
                self.model.save_pretrained(self.output, safe_serialization=True)
                save_json(self.output / "best-validation.json", record)
            else:
                self.stale += 1
            save_json(self.output / "history.json", self.history)
            self.save_training_state(epoch)
            print(json.dumps({"epoch": epoch, "validation_mean_iou": score, "best_mean_iou": self.best,
                              "selected_epoch": self.best_epoch, "epoch_seconds": record["epoch_seconds"]}), flush=True)
            if self.stale >= self.args.patience and epoch >= self.args.min_epochs:
                break
        del self.model, self.optimizer, self.scheduler

    def freeze(self):
        self.best_model = load_model(self.output, self.device)
        self.updated_validation = validation_record(self.best_model, self.valloader, self.device)
        reference_model = load_model(self.reference, self.device)
        self.reference_validation = validation_record(reference_model, self.valloader, self.device)
        del reference_model
        self.thresholds = self.updated_validation["validation_selected_thresholds"]
        save_json(self.output / "baseline-validation.json", self.reference_validation)
        save_json(self.output / "threshold-selection.json", {
            "method": "Per-class maximum validation IoU on predeclared grid",
            "partition": "validation only; frozen before locked test", "thresholds": self.thresholds,
            "validation_fixed_0_5": self.updated_validation["fixed_0_5"],
            "validation_selected": self.updated_validation["validation_at_selected_thresholds"],
            "sweep": self.updated_validation["sweep"], "threshold_grid_step": 1 / 32,
            "probabilities_calibrated": False, "target_domain_validated": False})
        save_json(self.output / "test-freeze.json", {
            "checkpoint_sha256": file_digest(self.output / "model.safetensors"),
            "reference_checkpoint_sha256": file_digest(self.reference / "model.safetensors"),
            "thresholds": self.thresholds,
            "reference_thresholds": self.reference_validation["validation_selected_thresholds"],
            "sample_manifest_sha256": file_digest(self.args.data / "sample-manifest.json"),
            "test_fields": len(self.fields["test"]), "frozen_before_test_labels_loaded": True})

    def evaluate_locked_test(self):
        testset = CachedSamples(self.args.data, "test")
        loader = DataLoader(testset, batch_size=self.args.batch_size, num_workers=0)
        updated, histogram = evaluate(self.best_model, loader, self.device)
        selected = metrics_at(histogram, self.thresholds)
        np.savez(self.output / "locked-test-histograms.npz", **histogram)
        del self.best_model
        reference_model = load_model(self.reference, self.device)
        reference, reference_hist = evaluate(reference_model, loader, self.device)
        reference_selected = metrics_at(reference_hist, self.reference_validation["validation_selected_thresholds"])
        del reference_model
        self.comparison = {
            "test_policy": self.manifest["test_policy"], "test_tiles": len(testset),
            "test_fields": len(self.fields["test"]), "reference_checkpoint": str(self.reference),
            "fixed_0_5": {"original": reference, "updated": updated},
            "validation_selected_thresholds": {"original": reference_selected, "updated": selected},
            "evaluation_resolution_px": 256, "target_domain": "Agriculture-Vision US aerial imagery only",
            "coffee_validated": False, "satellite_validated": False, "disease_or_pest_labels": False}
        save_json(self.output / "locked-test-comparison.json", self.comparison)

    def finish(self):
        digest = file_digest(self.output / "model.safetensors")
        summary = {key: self.metadata[key] for key in ("base_model", "base_revision", "license")}
        summary.update({
            "model_version": digest[:16], "checkpoint_sha256": digest, **self.provenance,
            "initial_checkpoint": self.provenance["initial_checkpoint_sha256"][:16],
            "classes": CLASSES, "channels": ["red", "green", "blue", "nir"],
            "normalization": {"mean": MEAN, "std": STD}, "input_size": 256, "seed": self.args.seed,
            "train_tiles": len(self.trainset), "validation_tiles": len(self.valset),
            "test_tiles": len(self.manifest["splits"]["test"]), "field_counts": self.manifest["field_counts"],
            "optimizer_steps": self.steps, "epochs_completed": len(self.history), "selected_epoch": self.best_epoch,
            "elapsed_seconds": time.time() - self.started, "learning_rate_encoder": self.args.lr,
            "learning_rate_decoder": self.args.lr * 5,
            "loss": "Masked positive-weighted BCE (sqrt imbalance, cap 8) + 0.5 Dice on batch-positive classes",
            "checkpoint_selection": "Maximum validation mean foreground IoU at 0.5; starting weights retained unless improved",
            "training_domain": "Agriculture-Vision US aerial RGB+NIR; JPEG digital numbers /255",
            "locked_test_mean_iou_fixed_0_5": self.comparison["fixed_0_5"]["updated"]["mean_iou_present_classes"],
            "locked_test_mean_iou_validation_selected": self.comparison["validation_selected_thresholds"]["updated"]["mean_iou_present_classes"],
            "coffee_validated": False, "satellite_validated": False, "disease_or_pest_labels": False,
            "production_ready": False, "status": "Windows warm-start research checkpoint"})
        save_json(self.output / "training-summary.json", summary)
        for name in ("sample-manifest.json", "dataset-statistics.json"):
            shutil.copyfile(self.args.data / name, self.output / name)
        for source in Path(self.provenance["metadata_source"]).parent.iterdir():
            if "license" in source.name.lower() and source.is_file():
                shutil.copyfile(source, self.output / source.name)
        print("TRAINING COMPLETE " + json.dumps(summary), flush=True)


def run(args):
    session = ExpandedRun(args)
    session.setup()
    session.train()
    session.freeze()
    session.evaluate_locked_test()
    session.finish()
