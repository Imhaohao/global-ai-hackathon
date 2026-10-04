"""Verify completed B1 training provenance and package self-contained validation."""

import json
from collections import Counter

import numpy as np
import torch

from b1_model import LABELS, MANIFEST, ROOT, RUN, load_model, sha256
from b1_train import initialize, predict, write_json


def check_images(rows):
    mismatches = []
    for row in rows:
        actual = sha256(ROOT / row["path"])
        if actual != row["sha256"]:
            mismatches.append(
                {"path": row["path"], "expected": row["sha256"], "actual": actual}
            )
    result = {
        "checked": len(rows),
        "split_counts": dict(Counter(row["split"] for row in rows)),
        "source_counts": {
            split: dict(Counter(row["source"] for row in rows if row["split"] == split))
            for split in ["train", "val"]
        },
        "mismatches": mismatches,
    }
    if mismatches:
        write_json(RUN / "completion_verification.json", result)
        raise ValueError("Training or validation image bytes differ from the manifest")
    return result


def package_validation(rows):
    path = RUN / "selected_validation.npz"
    with np.load(path) as saved:
        logits, labels = saved["logits"].copy(), saved["labels"].copy()
    expected = np.array([LABELS.index(row["label"]) for row in rows])
    if len(logits) != len(rows) or not np.array_equal(labels, expected):
        raise ValueError(
            "Selected validation predictions do not align with manifest order"
        )
    temporary = path.with_name("selected_validation.partial.npz")
    np.savez(
        temporary, logits=logits, labels=labels, paths=[row["path"] for row in rows]
    )
    temporary.replace(path)
    return logits, labels


def verify_logits(model, rows, logits, labels):
    rng = np.random.default_rng(20261003)
    indices = np.concatenate(
        [
            rng.choice(
                np.flatnonzero(labels == label),
                min(12, int(np.sum(labels == label))),
                replace=False,
            )
            for label in range(8)
        ]
    )
    fresh = predict(model, [rows[int(index)] for index in indices])
    reference = logits[indices]
    error = float(np.max(np.abs(fresh - reference)))
    disagreement = int(np.sum(fresh.argmax(1) != reference.argmax(1)))
    if error > 1e-4 or disagreement:
        raise ValueError(
            "Selected checkpoint and validation cache disagree: "
            f"{error}, {disagreement}"
        )
    return {
        "n": len(indices),
        "max_absolute_logit_difference": error,
        "top1_differences": disagreement,
    }


def selection_checks(report):
    baseline = report["head_baseline"]
    selected = (
        baseline
        if report["selected_epoch"] == 0
        else next(
            row
            for row in report["backbone_history"]
            if row["epoch"] == report["selected_epoch"]
        )
    )

    def old_macro(metrics):
        return float(np.mean(list(metrics["old_class_f1"].values())))

    return {
        "selected_validation": selected,
        "additional_validation_only_guard_audit": {
            "old_macro_f1_loss_at_most_1pp": old_macro(selected)
            >= old_macro(baseline) - 0.01,
            "old_native_accuracy_loss_at_most_1pp": selected["old_native_accuracy"]
            >= baseline["old_native_accuracy"] - 0.01,
            "each_weak_class_loss_at_most_1pp": all(
                selected["old_class_f1"][label]
                >= baseline["old_class_f1"][label] - 0.01
                for label in ["cercospora", "healthy", "red_spider_mite"]
            ),
            "source_f1_gain_at_least_1pp": selected["source_macro_f1"]
            >= baseline["source_macro_f1"] + 0.01,
            "far_f1_gain_at_least_1_5pp": selected["far_macro_f1"]
            >= baseline["far_macro_f1"] + 0.015,
        },
        "guard_audit_note": (
            "Additional broader B0-style guards audited after selection; "
            "no test data, checkpoint reselection, or further training "
            "used for this audit."
        ),
    }


def training_stopping(report):
    best_score, head_epoch = -1.0, 0
    for row in report["head_history"]:
        if row["selection_score"] > best_score + 0.002:
            best_score, head_epoch = row["selection_score"], row["epoch"]
    completed = len(report["backbone_history"])
    return {
        "head_completed_epochs": len(report["head_history"]),
        "head_selected_epoch": head_epoch,
        "backbone_completed_epochs": completed,
        "backbone_reason": "validation_patience_exhausted"
        if completed < 6
        else "predeclared_maximum_epochs_reached",
        "checkpoint_selection": (
            "Validation composite and weak-class preservation only; "
            "test and external images never used for model selection"
        ),
    }


def main():
    initialize()
    report = json.loads((RUN / "training.json").read_text())
    if report["status"] != "complete":
        raise ValueError("Training must complete before final verification")
    all_rows = json.loads(MANIFEST.read_text())["images"]
    rows = [row for row in all_rows if row["split"] in {"train", "val"}]
    result = check_images(rows)
    validation = [row for row in rows if row["split"] == "val"]
    logits, labels = package_validation(validation)
    model = load_model(RUN / "best.safetensors").to(memory_format=torch.channels_last)
    result["selected_checkpoint_validation_cache_check"] = verify_logits(
        model, validation, logits, labels
    )
    result["checkpoint_sha256"] = sha256(RUN / "best.safetensors")
    result["manifest_sha256"] = sha256(MANIFEST)
    assert result["checkpoint_sha256"] == report["checkpoint_sha256"]
    assert result["manifest_sha256"] == report["manifest_sha256"]
    result.update(selection_checks(report))
    report["stopping"] = training_stopping(report)
    report["completion_verification"] = result
    write_json(RUN / "completion_verification.json", result)
    write_json(RUN / "training.json", report)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
