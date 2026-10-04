import csv
import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import imagehash
import numpy as np
from ai_edge_litert.interpreter import Interpreter
from evaluate_additional import binary_metrics, quality_evaluation, quality_features
from export_mobile import raw_tensor
from finetune import predict, summarize
from model_utils import LABELS, ROOT, initialize_runtime, load_model, read_records
from PIL import Image

RUN = ROOT / "runs/efficientnet"
ARTIFACT = ROOT.parent / "mobile/assets/model/coffee-leaf.tflite"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def mobile_predict(records, name):
    signature = hashlib.sha256(
        (sha(ARTIFACT) + json.dumps(records, sort_keys=True)).encode()
    ).hexdigest()
    cache = RUN / f"deployed_{name}.npz"
    if cache.exists():
        data = np.load(cache)
        if str(data["signature"]) == signature:
            return data["probabilities"], data["quality"], data["latencies"]
    interpreter = Interpreter(model_path=str(ARTIFACT), num_threads=4)
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]
    probabilities, quality, latencies = [], [], []
    for index, row in enumerate(records):
        raw = raw_tensor(row["path"])
        quality.append(quality_features(raw[0]))
        interpreter.set_tensor(inp["index"], raw)
        started = time.perf_counter()
        interpreter.invoke()
        latencies.append((time.perf_counter() - started) * 1000)
        probabilities.append(interpreter.get_tensor(out["index"])[0])
        if index % 500 == 0:
            print(name, index, "/", len(records), flush=True)
    probabilities, quality, latencies = map(
        np.array, (probabilities, quality, latencies)
    )
    assert np.isfinite(probabilities).all()
    np.testing.assert_allclose(probabilities.sum(1), 1, atol=1e-4)
    np.savez(
        cache,
        probabilities=probabilities,
        quality=quality,
        latencies=latencies,
        signature=signature,
    )
    return probabilities, quality, latencies


def decisions(probabilities, quality, calibration):
    chosen = probabilities.argmax(1)
    scores = probabilities.max(1)
    accept = np.array(calibration["class_thresholds"] + [1.01])
    confident = np.array(calibration["confident_thresholds"] + [1.01])
    limits = calibration["quality"]
    clear = (quality[:, 0] >= limits["minimum_edge_variance"]) & (
        quality[:, 1] >= limits["minimum_mean_luminance"]
    )
    accepted = (scores >= accept[chosen]) & clear & (chosen < 7)
    states = np.where(
        accepted,
        np.where(scores >= confident[chosen], "confident", "possible"),
        "unclear",
    )
    return chosen, accepted, states


def calibrate_mobile(probabilities, quality, y, config):
    chosen = probabilities.argmax(1)
    limits = config["quality"]
    clear = (quality[:, 0] >= limits["minimum_edge_variance"]) & (
        quality[:, 1] >= limits["minimum_mean_luminance"]
    )
    thresholds, confident = [], []
    for label in range(7):
        candidates = {0.9: [], 0.95: []}
        for threshold in np.linspace(0.4, 0.995, 120):
            accepted = (
                (chosen == label) & (probabilities[:, label] >= threshold) & clear
            )
            if accepted.sum() < 15:
                continue
            for precision, selected in candidates.items():
                if (y[accepted] == label).mean() >= precision:
                    selected.append(float(threshold))
        thresholds.append(min(candidates[0.9], default=1.01))
        confident.append(min(candidates[0.95], default=1.01))
    config.update(
        class_thresholds=thresholds,
        confident_thresholds=confident,
        selection="Validation-only deployed FP16 runtime scores with frozen quality gate; >=15 accepted and >=90%/95% validation precision per class",
        runtime="ai-edge-litert CPU float16 storage / float32 computation",
        artifact_sha256=sha(ARTIFACT),
        version="deployed-v1",
    )
    config.pop("accept_threshold", None)
    config["class_threshold_evidence"] = [
        {
            "label": LABELS[i],
            "enabled": thresholds[i] <= 1,
            "accept_threshold": thresholds[i],
            "val_true_support": int((y == i).sum()),
        }
        for i in range(7)
    ]
    return config


def accepted_metrics(probabilities, quality, y, config):
    chosen, accepted, _ = decisions(probabilities, quality, config)
    return {
        "n": len(y),
        "accepted_n": int(accepted.sum()),
        "accepted_coverage": float(accepted.mean()),
        "accepted_accuracy": float((chosen[accepted] == y[accepted]).mean())
        if accepted.any()
        else None,
        "unsupported_reject_rate": float((~accepted[y == 7]).mean())
        if (y == 7).any()
        else None,
    }


def audited_external(records, candidates=None, filename="external_audit.json"):
    binary = (
        candidates
        if candidates is not None
        else json.loads((ROOT / "data/multispec_binary.json").read_text())
    )
    references = [
        r for r in records if r["split"] in ["train", "val"] or r["pretraining_exposed"]
    ]
    exact = {r["sha256"] for r in references}
    hashes = {int(r["phash"]) for r in references}
    kept, excluded = [], []
    for row in binary:
        path = ROOT / row["path"]
        with Image.open(path) as image:
            value = int(str(imagehash.phash(image.convert("RGB"))), 16)
        overlaps = sha(path) in exact or any(
            (value ^ reference).bit_count() <= 5 for reference in hashes
        )
        (excluded if overlaps else kept).append(row)
    audit = {
        "total": len(binary),
        "excluded": len(excluded),
        "excluded_by_label": dict(Counter(r["label"] for r in excluded)),
        "retained": len(kept),
        "method": "SHA256 and pHash distance<=5 against fine-tuning train/validation and known pretraining-exposed groups; no plant IDs available",
        "excluded_paths": [r["path"] for r in excluded],
    }
    (RUN / filename).write_text(json.dumps(audit, indent=2))
    return kept, audit


def select_binary_threshold(scores, y):
    choices = np.linspace(0.01, 0.99, 99)
    balanced = [
        0.5 * ((scores[y] >= t).mean() + (scores[~y] < t).mean()) for t in choices
    ]
    return float(choices[int(np.argmax(balanced))])


def external_evaluation(records, val, val_probs, config):
    rows, audit = audited_external(records)
    probabilities, _quality, _ = mobile_predict(rows, "rust_stress")
    wrapped = [
        dict(r, label="rust" if r["label"] == "rust" else "healthy") for r in rows
    ]
    baseline = load_model().eval()
    original_logits, _ = predict(baseline, wrapped)
    original_val, _ = predict(baseline, val)
    original_scores = original_logits[:, :5].softmax(1)[:, 4].numpy()
    original_val_scores = original_val[:, :5].softmax(1)[:, 4].numpy()
    val_y = np.array([r["label"] == "rust" for r in val])
    fine_threshold = select_binary_threshold(val_probs[:, 4], val_y)
    original_threshold = select_binary_threshold(original_val_scores, val_y)
    truth = np.array([r["label"] == "rust" for r in rows], dtype=int)
    return {
        "status": "Previously inspected development stress test; no checkpoint or gates selected on it",
        "audit": audit,
        "fine_tuned": binary_metrics(probabilities[:, 4], truth, fine_threshold),
        "original": binary_metrics(original_scores, truth, original_threshold),
        "note": "Each model uses its own validation-selected binary threshold; NoRust is not a healthy label",
    }


def scan_records():
    rows = list(csv.DictReader((ROOT / "data/scans/metadata.csv").open()))
    mapping = {"roya": "rust", "healthy": "healthy", "ojo": "unsupported"}
    return [
        {
            "path": str(Path("data/scans/images") / r["category"] / r["file"]),
            "label": mapping[r["category"]],
            "source": "pg26038_scans",
            "split": "external",
            "parent": r["leaf_id"],
            "category": r["category"],
        }
        for r in rows
    ]


def scan_evaluation(config, records):
    rows, audit = audited_external(records, scan_records(), "scan_audit.json")
    probabilities, quality, _ = mobile_predict(rows, "untouched_scans")
    truth = np.array([LABELS.index(r["label"]) for r in rows])
    result = accepted_metrics(probabilities, quality, truth, config)
    result.update(
        duplicate_audit=audit,
        status="Untouched external source before this fixed-model evaluation; flatbed scans, not phone photographs",
        independent_leaves=len({r["parent"] for r in rows}),
        note="Mycena citricolor is unsupported, never mapped to cercospora; paired leaf sides are repeated measurements",
        supported_accuracy=float(
            (probabilities.argmax(1)[truth != 7] == truth[truth != 7]).mean()
        ),
    )
    return result


def enrich_report(final, test, probabilities, quality, y, config):
    indices = [
        i
        for i, row in enumerate(test)
        if row["source"] != "agml" and not row["pretraining_exposed"]
    ]
    final["unseen_new_source"] = {
        "raw": summarize(probabilities[indices], y[indices]),
        "deployed": accepted_metrics(
            probabilities[indices], quality[indices], y[indices], config
        ),
    }
    final["evaluated_at_utc"] = datetime.now(timezone.utc).isoformat()
    final["split_counts"] = dict(Counter(r["split"] for r in read_records()))
    final["data_audit"] = json.loads((ROOT / "data/manifest.json").read_text())["audit"]
    final["model_revision"] = json.loads((ARTIFACT.parent / "model-config.json").read_text())["model_revision"]
    final["calibration"] = config
    final["checkpoint_sha256"] = sha(RUN / "best.safetensors")
    final["manifest_sha256"] = sha(ROOT / "data/manifest.json")
    final["artifact_mib"] = final["artifact_bytes"] / 1024**2
    for name, filename in [
        ("scan_duplicate_audit", "scan_audit.json"),
        ("offline", "offline_verification.json"),
    ]:
        path = RUN / filename
        if path.exists():
            evidence = json.loads(path.read_text())
            if name != "offline" or evidence.get("artifact_sha256") == final["artifact_sha256"]:
                final[name] = evidence
    final["limitations"] = [
        "Internal holdout includes AGML examples potentially seen in pretraining; use unseen_new_source and external results separately.",
        "Native phone interpolation/JPEG and camera distribution remain unvalidated.",
        "Severe synthetic blur rejection is weak; no general image-quality guarantee.",
        "FP16 conversion changes some decisions; thresholds use deployed validation scores.",
        "Physical Android/iOS offline and latency tests not performed.",
    ]


def persist_evaluation(final):
    serialized = json.dumps(final, indent=2, allow_nan=False) + "\n"
    (RUN / "final_evaluation.json").write_text(serialized)
    destination = ROOT / "results"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "final-evaluation.json").write_text(serialized)


def main():
    initialize_runtime()
    records = read_records()
    val = [r for r in records if r["split"] == "val"]
    test = [r for r in records if r["split"] == "test"]
    config = json.loads((RUN / "calibration.json").read_text())
    val_probs, val_quality, _ = mobile_predict(val, "validation")
    config = calibrate_mobile(
        val_probs,
        val_quality,
        np.array([LABELS.index(r["label"]) for r in val]),
        config,
    )
    (RUN / "calibration.json").write_text(json.dumps(config, indent=2))
    metadata_path = ARTIFACT.parent / "model-config.json"
    metadata = json.loads(metadata_path.read_text())
    metadata["calibration"] = config
    metadata["calibration_sha256"] = sha(RUN / "calibration.json")
    metadata_path.write_text(json.dumps(metadata, indent=2))
    probabilities, quality, timing = mobile_predict(test, "test")
    y = np.array([LABELS.index(r["label"]) for r in test])
    python = np.load(RUN / "test_predictions.npz")["probabilities"]
    chosen, accepted, states = decisions(probabilities, quality, config)
    original_chosen, original_accepted, original_states = decisions(
        python, quality, config
    )
    final = {
        "calibration_sha256": sha(RUN / "calibration.json"),
        "artifact_sha256": sha(ARTIFACT),
        "raw": summarize(probabilities, y),
        "deployed": accepted_metrics(probabilities, quality, y, config),
        "parity": {
            "top1_disagreements": int((chosen != original_chosen).sum()),
            "acceptance_disagreements": int((accepted != original_accepted).sum()),
            "confidence_state_disagreements": int((states != original_states).sum()),
            "maximum_probability_error": float(np.max(np.abs(probabilities - python))),
            "handling": "Thresholds calibrated on deployed runtime validation outputs; deployed decisions authoritative. Disagreements retained in report.",
        },
        "model_parameters": sum(p.numel() for p in load_model().parameters()),
        "artifact_bytes": ARTIFACT.stat().st_size,
        "desktop_median_ms": float(np.median(timing)),
        "phone_device_tested": False,
    }
    final["per_source"] = {
        source: accepted_metrics(probabilities[idx], quality[idx], y[idx], config)
        for source in sorted({r["source"] for r in test})
        for idx in [[i for i, r in enumerate(test) if r["source"] == source]]
    }
    _, final["quality"] = quality_evaluation(records, config["quality"])
    final["rust_stress"] = external_evaluation(records, val, val_probs, config)
    final["untouched_scans"] = scan_evaluation(config, records)
    enrich_report(final, test, probabilities, quality, y, config)
    persist_evaluation(final)
    results = json.loads((RUN / "results.json").read_text())
    results["calibration"] = config
    for part in ["test", "external"]:
        results[part].pop("accepted_coverage", None)
        results[part].pop("accepted_accuracy", None)
    results["final_deployed_evaluation"] = "final_evaluation.json"
    (RUN / "results.json").write_text(json.dumps(results, indent=2))
    (RUN / "additional_evaluation.json").write_text(
        json.dumps(
            {
                "calibration_sha256": final["calibration_sha256"],
                "quality": final["quality"],
                "rust_source_holdout": final["rust_stress"],
            },
            indent=2,
        )
    )
    print(
        json.dumps(
            {k: v for k, v in final.items() if k not in ["raw", "per_source"]}, indent=2
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
