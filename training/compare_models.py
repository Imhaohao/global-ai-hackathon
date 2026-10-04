"""Compare frozen B0 and B1 artifacts without training, selecting or publishing."""

import argparse
import gc
import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch

from b1_model import B1Dataset, load_model as load_b1
from compare_model_runtime import (
    BRIGHTNESS,
    LABELS,
    ROOT,
    RUN,
    cache_signature,
    decisions,
    gate_metrics,
    image_input,
    interpreter_for,
    manifest_records,
    read_json,
    runtime_predict,
    sha,
    write_json,
)
from compare_models_report import (
    audit_manifests,
    detailed_summary,
    external_audit,
    make_figure,
    group_probe_indices,
    matched_subsets,
    paired_accuracy_interval,
    reference_union,
    scan_rows,
    source_summaries,
    subset_summaries,
    truth_for,
    weak_class_comparison,
)
from evaluate_additional import binary_metrics
from final_evaluation import select_binary_threshold
from model_utils import LeafDataset, load_model as load_b0

ASSETS = ROOT.parent / "mobile/assets/model"
MODEL_NAMES = ["b0", "b1"]


def specifications():
    return {
        "b0": dict(
            artifact=ASSETS / "coffee-leaf.tflite",
            config=ASSETS / "model-config.json",
            checkpoint=ROOT / "runs/efficientnet/best.safetensors",
            loader=load_b0,
            dataset=LeafDataset,
        ),
        "b1": dict(
            artifact=ASSETS / "coffee-leaf-b1.tflite",
            config=ASSETS / "model-config-b1.json",
            checkpoint=ROOT / "runs/efficientnet_b1/best.safetensors",
            loader=load_b1,
            dataset=B1Dataset,
        ),
    }


def validate_specs(specs):
    for name, spec in specs.items():
        config = read_json(spec["config"])
        if config["labels"] != LABELS:
            raise ValueError(f"Wrong labels for {name}")
        expected = config["calibration"].get("artifact_sha256")
        if expected and expected != sha(spec["artifact"]):
            raise ValueError(f"Calibration is for a different {name} artifact")
        spec["calibration"] = config["calibration"]


def identities(specs):
    paths = {
        f"{name}_{key}": spec[key]
        for name, spec in specs.items()
        for key in ["artifact", "config", "checkpoint"]
    }
    paths.update(
        brightness=BRIGHTNESS,
        b0_manifest=ROOT / "data/manifest.json",
        b1_manifest=ROOT / "data/scale_v3_manifest.json",
    )
    return {
        name: dict(path=str(path), sha256=sha(path), bytes=path.stat().st_size)
        for name, path in paths.items()
    }


def checkpoint_signature(spec, rows):
    digest = hashlib.sha256(
        cache_signature(
            spec["checkpoint"], rows, "checkpoint", torch.get_num_threads()
        ).encode()
    )
    for path in [
        spec["config"],
        Path(__file__),
        ROOT / "b1_model.py",
        ROOT / "model_utils.py",
    ]:
        digest.update(bytes.fromhex(sha(path)))
    return digest.hexdigest()


def predict_checkpoint(name, spec, rows):
    cache = RUN / f"{name}_checkpoint_test.npz"
    signature = checkpoint_signature(spec, rows)
    if cache.exists():
        with np.load(cache) as stored:
            if str(stored["signature"]) == signature:
                return stored["probabilities"], int(stored["parameter_count"])
    model = (
        spec["loader"](spec["checkpoint"]).eval().to(memory_format=torch.channels_last)
    )
    parameters = sum(parameter.numel() for parameter in model.parameters())
    loader = torch.utils.data.DataLoader(
        spec["dataset"](rows), batch_size=16, shuffle=False, num_workers=0
    )
    probabilities = []
    with torch.inference_mode():
        for batch, (images, _) in enumerate(loader):
            logits = model(images.to(memory_format=torch.channels_last))
            probabilities.append(
                (logits / spec["calibration"]["temperature"]).softmax(1).numpy()
            )
            if batch % 32 == 0:
                print(
                    name,
                    "checkpoint",
                    min((batch + 1) * 16, len(rows)),
                    "/",
                    len(rows),
                    flush=True,
                )
    result = np.concatenate(probabilities)
    np.savez(
        cache, probabilities=result, parameter_count=parameters, signature=signature
    )
    del model, loader
    gc.collect()
    return result, parameters


def parity_report(checkpoint, deployed, calibration):
    first = decisions(checkpoint, deployed["quality"], calibration)
    second = decisions(deployed["probabilities"], deployed["quality"], calibration)
    difference = np.abs(checkpoint - deployed["probabilities"])
    return dict(
        n=len(checkpoint),
        top1_disagreements=int((first[0] != second[0]).sum()),
        acceptance_disagreements=int((first[1] != second[1]).sum()),
        confidence_state_disagreements=int((first[2] != second[2]).sum()),
        maximum_probability_error=float(difference.max()),
        mean_absolute_probability_error=float(difference.mean()),
        explanation="All held-out images, shared current app quality policy and each model's frozen confidence thresholds; checkpoint canonical transform matches raw runtime input",
    )


def evaluate_model(name, spec, test, selections):
    data = runtime_predict(
        spec["artifact"], test, f"{name}_test", threads=spec["threads"]
    )
    checkpoint, parameters = predict_checkpoint(name, spec, test)
    truth = truth_for(test)
    report = dict(
        parameter_count=parameters,
        artifact_bytes=spec["artifact"].stat().st_size,
        under_10_decimal_MB=spec["artifact"].stat().st_size < 10_000_000,
        artifact_sha256=sha(spec["artifact"]),
        checkpoint_sha256=sha(spec["checkpoint"]),
        subsets=subset_summaries(data, test, spec["calibration"], selections),
        per_source=source_summaries(data, test, spec["calibration"]),
        checkpoint_runtime_parity=parity_report(checkpoint, data, spec["calibration"]),
        legacy_brightness_app_metrics=gate_metrics(
            data["probabilities"],
            data["quality"],
            truth,
            spec["calibration"],
            legacy=True,
        ),
        class_thresholds=spec["calibration"]["class_thresholds"],
        confident_thresholds=spec["calibration"]["confident_thresholds"],
        calibration=spec["calibration"],
    )
    return data, report


def rust_threshold(name, spec, expanded):
    if name == "b0":
        return (
            0.28,
            "B0's previously validation-selected threshold, frozen before this comparison",
        )
    validation = [row for row in expanded if row["split"] == "val"]
    data = runtime_predict(
        spec["artifact"], validation, validation_cache_name(), threads=spec["threads"]
    )
    truth = np.array([row["label"] == "rust" for row in validation])
    return (
        select_binary_threshold(data["probabilities"][:, 4], truth),
        "Maximum balanced accuracy on B1 multiclass validation only; no external selection",
    )


def validation_cache_name():
    path = ROOT / "runs/efficientnet_b1/export_validation.json"
    if not path.exists():
        return "b1_binary_validation"
    candidates = read_json(path).get("compression_candidates", [])
    if not candidates:
        return "b1_binary_validation"
    selected = candidates[-1]
    variant = selected.get("variant")
    if selected.get("parity", {}).get("eligible") and variant in {
        "int8_weights",
        "head_fp32",
    }:
        return f"b1_validation_{variant}"
    return "b1_binary_validation"


def evaluate_rust(name, spec, rows, expanded):
    threshold, policy = rust_threshold(name, spec, expanded)
    data = runtime_predict(
        spec["artifact"], rows, f"{name}_external_rust", threads=spec["threads"]
    )
    truth = np.array([row["label"] == "rust" for row in rows])
    result = binary_metrics(data["probabilities"][:, 4], truth.astype(int), threshold)
    chosen, accepted, _ = decisions(
        data["probabilities"], data["quality"], spec["calibration"]
    )
    result.update(
        threshold_selection=policy,
        app_accepted_rust_on_rust=int((accepted & (chosen == 4) & truth).sum()),
        app_accepted_rust_on_not_rust=int((accepted & (chosen == 4) & ~truth).sum()),
        all_app_accepted=int(accepted.sum()),
        all_app_accepted_coverage=float(accepted.mean()),
        status="Previously inspected external development stress test; no checkpoint or gate selection on this source",
        qualification="NoRust is binary-negative ground truth only; it cannot score healthy or other disease predictions",
    )
    return result


def evaluate_scans(name, spec, rows):
    data = runtime_predict(
        spec["artifact"], rows, f"{name}_external_scans", threads=spec["threads"]
    )
    truth = truth_for(rows)
    supported = truth < 7
    result = detailed_summary(
        data, rows, spec["calibration"], sorted(set(truth.tolist()))
    )
    result.update(
        supported_n=int(supported.sum()),
        supported_raw_accuracy=float(
            (data["probabilities"].argmax(1)[supported] == truth[supported]).mean()
        ),
        independent_leaves=len({row["parent"] for row in rows}),
        status="Previously inspected separate-source stress test; flatbed scans, not camera photographs",
        qualification="Paired leaf sides repeat physical leaves; Mycena/Ojo maps to unsupported, never cercospora",
    )
    return result


def evaluate_far(name, spec, test, indices):
    rows = [test[int(index)] for index in indices]
    data = runtime_predict(
        spec["artifact"],
        rows,
        f"{name}_scale_probe",
        variant="far_65_percent",
        threads=spec["threads"],
    )
    result = detailed_summary(data, rows, spec["calibration"])
    result.update(
        per_source=source_summaries(data, rows, spec["calibration"]),
        class_counts={
            label: int((truth_for(rows) == i).sum()) for i, label in enumerate(LABELS)
        },
        selection="One seeded example per source/group/label from the frozen expanded test; identical images for both models",
        image_transform="Shrink canonical 224px crop to 146px, center it on a 224px median-RGB canvas; identical raw pixels for both models",
        qualification="Synthetic distance stress, not evidence from genuine distant field photographs; differs from full-image padding used in training",
    )
    return result


def benchmark_rows(rows):
    selected = []
    rng = np.random.default_rng(20261003)
    for label in LABELS:
        pool = [index for index, row in enumerate(rows) if row["label"] == label]
        selected.extend(rng.choice(pool, min(8, len(pool)), replace=False).tolist())
    rng.shuffle(selected)
    return [rows[index] for index in selected]


def warmed_benchmark(specs, rows, threads):
    selected = benchmark_rows(rows)
    raw_inputs = [image_input(row, "canonical") for row in selected]
    runtimes = {
        name: interpreter_for(spec["artifact"], threads) for name, spec in specs.items()
    }
    timings = {name: [] for name in specs}
    for interpreter, inp, _ in runtimes.values():
        for raw in raw_inputs[:8]:
            interpreter.set_tensor(inp, raw)
            interpreter.invoke()
    for repeat in range(2):
        for index, raw in enumerate(raw_inputs):
            order = (
                MODEL_NAMES
                if (index + repeat) % 2 == 0
                else list(reversed(MODEL_NAMES))
            )
            for name in order:
                interpreter, inp, _ = runtimes[name]
                interpreter.set_tensor(inp, raw)
                start = time.perf_counter()
                interpreter.invoke()
                timings[name].append((time.perf_counter() - start) * 1000)
    return dict(
        models={
            name: dict(
                n=len(values),
                median_ms=float(np.median(values)),
                p90_ms=float(np.quantile(values, 0.90)),
                mean_ms=float(np.mean(values)),
            )
            for name, values in timings.items()
        },
        num_threads=threads,
        warmup_invocations_per_model=min(8, len(raw_inputs)),
        unique_images=len(raw_inputs),
        repetitions=2,
        image_paths=[row["path"] for row in selected],
        host=platform.node(),
        cpu=platform.processor(),
        method="Fresh uncached same-process CPU interpreter.invoke timing; same preloaded raw inputs, alternating model order; excludes image loading and preprocessing",
        physical_phone_benchmarked=False,
        qualification="Run after training/export finishes; desktop timing does not predict physical phone latency",
    )


def paired_differences(test, data, selections):
    result = {}
    for name, indices in selections.items():
        if not len(indices):
            continue
        rows = [test[int(index)] for index in indices]
        result[name] = paired_accuracy_interval(
            rows,
            data["b0"]["probabilities"][indices],
            data["b1"]["probabilities"][indices],
        )
    return result


def qualifications():
    return [
        "This compares delivered systems. B0 uses coffee-specific pretrained weights and the original training corpus; B1 uses ImageNet initialization plus additional vetted training data. It does not isolate architecture.",
        "All eight output classes compete even on five-class truth; unsupported or new-class predictions count as errors in those subsets.",
        "AGML and every known coffee-pretraining-exposed group are excluded in the named shared subset; unknown pretraining exposure cannot be ruled out.",
        "Reviewed BRACOL crops reuse original parents; row counts do not equal independent leaves. Sources with unresolved taxonomy, provenance or augmentation leakage remain excluded.",
        "Current alpha-aware brightness policy is frozen and shared. Legacy brightness results are separately labeled; class confidence gates are each model's own frozen validation calibration.",
        "External rust and scans have been inspected previously and are development stress tests. No model, confidence gate, compression choice or brightness limit is chosen from them.",
        "Source labels reflect publisher annotations; independent laboratory diagnosis and real phone field validation have not been performed.",
    ]


def metric_definitions():
    return {
        "accepted_accuracy": "Correct accepted diagnoses divided by all accepted diagnoses; null if no diagnosis is accepted",
        "accepted_coverage": "All accepted diagnoses, correct or incorrect, divided by all evaluated images",
        "correct_accepted_fraction": "Correct accepted diagnoses divided by all evaluated images",
        "accepted_precision_per_class": "Correct accepted diagnoses of a predicted class divided by every accepted diagnosis predicted as that class",
        "true_class_accepted_coverage": "Images with this ground-truth class accepted as any supported class, including wrong diagnoses, divided by this class's support",
        "correct_accepted_recall": "Correct accepted diagnoses of a ground-truth class divided by that class's support",
        "unsupported_false_accepts": "Ground-truth unsupported images receiving any accepted supported diagnosis",
        "raw_macro_f1": "Mean F1 over all eight classes, or the explicitly named five-class subset; per-source summaries average only classes present in that source",
        "rust_auroc": "Ranking of Rust versus NoRust scores, not diagnosis accuracy and independent of the displayed threshold",
    }


def source_evidence():
    paths = {
        "registry": ROOT / "sources.json",
        "scale_v3_label_audit": ROOT / "runs/scale_v3/label_audit.json",
        "scale_v3_crop_overlap_audit": ROOT / "runs/scale_v3/crop_overlap_audit.json",
        "xinzhai_audit": ROOT / "runs/scale_v3/xinzhai_source_audit.json",
        "context_coverage": ROOT / "runs/scale_v2/context_annotation_audit.json",
    }
    return {
        name: dict(path=str(path), sha256=sha(path))
        for name, path in paths.items()
        if path.exists()
    }


def training_evidence():
    paths = {
        "b1_training": ROOT / "runs/efficientnet_b1/training.json",
        "b1_head_training": ROOT / "runs/efficientnet_b1/head_training.json",
        "b1_pretraining": ROOT / "models/efficientnet_b1/provenance.json",
        "b1_export": ROOT / "runs/efficientnet_b1/export_validation.json",
        "b1_completion_verification": ROOT
        / "runs/efficientnet_b1/completion_verification.json",
        "b1_float32_conversion_parity": ROOT
        / "runs/efficientnet_b1/float32_conversion_parity.json",
        "b1_compression_validation": ROOT
        / "runs/efficientnet_b1/compression_validation.json",
        "b1_offline_verification": ROOT
        / "runs/efficientnet_b1/offline_verification.json",
    }
    return {
        name: dict(sha256=sha(path), report=read_json(path))
        for name, path in paths.items()
        if path.exists()
    }


def evaluate_all(specs, original, expanded, test, selections, external, scans):
    data, results = {}, {}
    probe_indices = group_probe_indices(test)
    for name, spec in specs.items():
        data[name], results[name] = evaluate_model(name, spec, test, selections)
        results[name]["external_rust"] = evaluate_rust(name, spec, external, expanded)
        results[name]["external_scans"] = evaluate_scans(name, spec, scans)
        results[name]["far_probe"] = evaluate_far(name, spec, test, probe_indices)
        write_json(RUN / f"{name}_comparison.json", results[name])
    return results, paired_differences(test, data, selections)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--audit-only", action="store_true")
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    original, expanded = manifest_records("manifest.json"), manifest_records()
    report = dict(
        generated_at_utc=datetime.now(timezone.utc).isoformat(),
        labels=LABELS,
        manifest_audits=audit_manifests(original, expanded, verify_bytes=True),
        source_evidence=source_evidence(),
        qualifications=qualifications(),
        metric_definitions=metric_definitions(),
    )
    if args.audit_only:
        write_json(RUN / "comparison_audit.json", report)
        print(
            json.dumps(
                {"audit_passed": True, "path": str(RUN / "comparison_audit.json")}
            )
        )
        return
    specs = specifications()
    for spec in specs.values():
        spec["threads"] = args.threads
    validate_specs(specs)
    report["identity_before"] = identities(specs)
    test = [row for row in expanded if row["split"] == "test"]
    selections = matched_subsets(test, original)
    references = reference_union(original, expanded)
    external, report["external_rust_audit"] = external_audit(
        read_json(ROOT / "data/multispec_binary.json"),
        references,
        "post_scale_external_audit.json",
    )
    scans, report["external_scan_audit"] = external_audit(
        scan_rows(), references, "post_scale_scan_audit.json"
    )
    report["models"], report["paired_accuracy_differences"] = evaluate_all(
        specs, original, expanded, test, selections, external, scans
    )
    report["latency"] = warmed_benchmark(specs, test, args.threads)
    report["weak_class_comparison"] = weak_class_comparison(report["models"])
    report["identity_after"] = identities(specs)
    report["training_evidence"] = training_evidence()
    report["frozen_artifacts_unchanged"] = (
        report["identity_before"] == report["identity_after"]
    )
    if not report["frozen_artifacts_unchanged"]:
        raise ValueError("An artifact changed during evaluation")
    write_json(RUN / "comparison.json", report)
    if args.output_dir:
        write_json(args.output_dir / "comparison.json", report)
        make_figure(report, args.output_dir / "comparison.png")
    print(
        json.dumps(
            {
                "completed": True,
                "path": str(RUN / "comparison.json"),
                "matched_test_n": len(test),
                "external_rust_n": len(external),
                "scan_n": len(scans),
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
