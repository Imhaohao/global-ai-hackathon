import json
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from sklearn.metrics import roc_auc_score, confusion_matrix, f1_score

from model_utils import ROOT, initialize_runtime, load_model, read_records
from finetune import predict
from export_mobile import raw_tensor

RUN = ROOT / "runs/efficientnet"


def binary_metrics(scores, labels, threshold):
    predicted = scores >= threshold
    negative = labels == 0
    positive = labels == 1
    return {
        "n": len(labels),
        "rust_n": int(positive.sum()),
        "not_rust_n": int(negative.sum()),
        "rust_recall": float(predicted[positive].mean()),
        "false_positive_rate": float(predicted[negative].mean()),
        "specificity": float((~predicted[negative]).mean()),
        "auroc": float(roc_auc_score(labels, scores)),
        "confusion_matrix": confusion_matrix(labels, predicted, labels=[0, 1]).tolist(),
        "threshold": threshold,
    }


def rust_evaluation(model, calibration, records):
    validation = [r for r in records if r["split"] == "val"]
    logits, labels = predict(model, validation)
    val_scores = (logits / calibration["temperature"]).softmax(1)[:, 4].numpy()
    truth = labels.numpy() == 4
    candidates = np.linspace(0.01, 0.99, 99)
    balanced = [
        0.5 * ((val_scores[truth] >= t).mean() + (val_scores[~truth] < t).mean())
        for t in candidates
    ]
    threshold = float(candidates[int(np.argmax(balanced))])
    binary = json.loads((ROOT / "data/multispec_binary.json").read_text())
    wrapped = [
        dict(r, label="rust" if r["label"] == "rust" else "healthy") for r in binary
    ]
    fine_logits, _ = predict(model, wrapped)
    baseline_logits, _ = predict(load_model().eval(), wrapped)
    y = np.array([r["label"] == "rust" for r in binary], dtype=int)
    fine = (fine_logits / calibration["temperature"]).softmax(1)[:, 4].numpy()
    baseline = baseline_logits[:, :5].softmax(1)[:, 4].numpy()
    return {
        "note": "NoRust is binary negative only; it is NOT a healthy diagnosis. Sourceheldout RGB; source lacks plantIDs and near-duplicate audit limited to currentmanifest.",
        "threshold_selection": "maximum balanced accuracy on multiclassvalidation; test not used",
        "fine_tuned": binary_metrics(fine, y, threshold),
        "baseline_at_same_threshold": binary_metrics(baseline, y, threshold),
    }


def quality_features(rgb):
    image = Image.fromarray(np.clip(rgb, 0, 255).astype("uint8")).convert("L")
    gray = np.array(image, dtype=np.float32)
    lap = (
        gray[1:-1, 1:-1] * 4
        - gray[2:, 1:-1]
        - gray[:-2, 1:-1]
        - gray[1:-1, 2:]
        - gray[1:-1, :-2]
    )
    return float(lap.var()), float(gray.mean())


def passes_quality(rgb, limits):
    edge, light = quality_features(rgb)
    return (
        edge >= limits["minimum_edge_variance"]
        and light >= limits["minimum_mean_luminance"]
    )


def quality_evaluation(records, limits):
    test = [r for r in records if r["split"] == "test" and r["label"] != "unsupported"][
        ::20
    ]
    clean, blurred, dark = [], [], []
    for row in test:
        rgb = raw_tensor(row["path"])[0]
        image = Image.fromarray(rgb.astype("uint8"))
        clean.append(passes_quality(rgb, limits))
        blurred.append(
            passes_quality(np.array(image.filter(ImageFilter.GaussianBlur(10))), limits)
        )
        dark.append(
            passes_quality(
                np.array(ImageEnhance.Brightness(image).enhance(0.01)), limits
            )
        )
    return limits, {
        "n_real_heldout_images": len(test),
        "clean_accept_rate": float(np.mean(clean)),
        "severe_blur_reject_rate": float(1 - np.mean(blurred)),
        "severe_darkness_reject_rate": float(1 - np.mean(dark)),
        "limitations": "Synthetic severe degradations of realheldoutimages; no validated mildblur threshold or actualphonecamera test.",
    }


def common_label_comparison():
    data = np.load(RUN / "test_predictions.npz")
    y = data["labels"]
    mask = y < 5
    baseline = data["baseline"][mask, :5].argmax(1)
    fine = data["probabilities"][mask].argmax(1)
    return {
        "n": int(mask.sum()),
        "note": "Same fiveoriginallabel examples; newhead predictionscountaserrors; mayincludesource-exposed AGML examples",
        "baseline_accuracy": float((baseline == y[mask]).mean()),
        "fine_tuned_accuracy": float((fine == y[mask]).mean()),
        "baseline_macro_f1": float(
            f1_score(y[mask], baseline, labels=list(range(5)), average="macro")
        ),
        "fine_tuned_macro_f1": float(
            f1_score(y[mask], fine, labels=list(range(5)), average="macro")
        ),
    }


def main():
    from final_evaluation import external_evaluation, mobile_predict, sha

    initialize_runtime()
    records = read_records()
    calibration = json.loads((RUN / "calibration.json").read_text())
    _, quality = quality_evaluation(records, calibration["quality"])
    validation = [r for r in records if r["split"] == "val"]
    probabilities, _, _ = mobile_predict(validation, "validation")
    report = {
        "calibration_sha256": sha(RUN / "calibration.json"),
        "rust_source_holdout": external_evaluation(
            records, validation, probabilities, calibration
        ),
        "quality": quality,
        "original_five_labels": common_label_comparison(),
    }
    (RUN / "additional_evaluation.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
