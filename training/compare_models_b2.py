"""Compare frozen B0/B1/B2 artifacts while preserving previous comparisons."""

import argparse
import copy
import gc
import hashlib
import itertools
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch

import compare_models as previous
from compare_model_runtime import (
    LABELS,
    ROOT,
    RUN as CACHE_RUN,
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
    external_audit,
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
from compare_models_b2_report import make_figure
from evaluate_additional import binary_metrics
from final_evaluation import select_binary_threshold

RUN = ROOT / "runs/model_comparison_b2"
B2_RUN = ROOT / "runs/efficientnet_b2"
MODEL_NAMES = ["b0", "b1", "b2"]


def specifications(threads=4):
    from b2_model import B2Dataset, load_model

    specs = previous.specifications()
    specs["b2"] = dict(
        artifact=previous.ASSETS / "coffee-leaf-b2.tflite",
        config=previous.ASSETS / "model-config-b2.json",
        checkpoint=B2_RUN / "best.safetensors",
        loader=load_model,
        dataset=B2Dataset,
    )
    for spec in specs.values():
        spec["threads"] = threads
    return specs


def identities(specs):
    result = previous.identities(specs)
    result["b2_manifest"] = copy.deepcopy(result["b1_manifest"])
    for name in ["comparison.json", "b0_comparison.json", "b1_comparison.json"]:
        path = CACHE_RUN / name
        if path.exists():
            result[f"previous_{name}"] = dict(
                path=str(path), sha256=sha(path), bytes=path.stat().st_size
            )
    return result


def b2_checkpoint_signature(spec, rows):
    digest = hashlib.sha256(
        cache_signature(
            spec["checkpoint"], rows, "checkpoint", spec["threads"]
        ).encode()
    )
    for path in [
        spec["config"],
        Path(__file__),
        ROOT / "b2_model.py",
        ROOT / "b1_model.py",
        ROOT / "model_utils.py",
    ]:
        digest.update(bytes.fromhex(sha(path)))
    return digest.hexdigest()


def predict_b2_checkpoint(spec, rows):
    cache = CACHE_RUN / "b2_checkpoint_test.npz"
    signature = b2_checkpoint_signature(spec, rows)
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
                    "b2 checkpoint",
                    min((batch + 1) * 16, len(rows)),
                    "/",
                    len(rows),
                    flush=True,
                )
    result = np.concatenate(probabilities)
    CACHE_RUN.mkdir(parents=True, exist_ok=True)
    np.savez(
        cache, probabilities=result, parameter_count=parameters, signature=signature
    )
    del model, loader
    gc.collect()
    return result, parameters


def evaluate_b2(spec, test, selections):
    data = runtime_predict(spec["artifact"], test, "b2_test", threads=spec["threads"])
    checkpoint, parameters = predict_b2_checkpoint(spec, test)
    report = dict(
        parameter_count=parameters,
        artifact_bytes=spec["artifact"].stat().st_size,
        under_10_decimal_MB=spec["artifact"].stat().st_size < 10_000_000,
        artifact_sha256=sha(spec["artifact"]),
        checkpoint_sha256=sha(spec["checkpoint"]),
        subsets=subset_summaries(data, test, spec["calibration"], selections),
        per_source=source_summaries(data, test, spec["calibration"]),
        checkpoint_runtime_parity=previous.parity_report(
            checkpoint, data, spec["calibration"]
        ),
        legacy_brightness_app_metrics=gate_metrics(
            data["probabilities"],
            data["quality"],
            truth_for(test),
            spec["calibration"],
            legacy=True,
        ),
        class_thresholds=spec["calibration"]["class_thresholds"],
        confident_thresholds=spec["calibration"]["confident_thresholds"],
        calibration=spec["calibration"],
    )
    return data, report


def b2_validation_cache_name():
    path = B2_RUN / "export_validation.json"
    if not path.exists():
        return "b2_binary_validation"
    candidates = read_json(path).get("compression_candidates", [])
    if not candidates:
        return "b2_binary_validation"
    selected = candidates[-1]
    variant = selected.get("variant")
    if selected.get("parity", {}).get("eligible") and variant in {
        "int8_weights",
        "head_fp32",
    }:
        return f"b2_validation_{variant}"
    return "b2_binary_validation"


def b2_rust_threshold(spec, expanded):
    rows = [row for row in expanded if row["split"] == "val"]
    data = runtime_predict(
        spec["artifact"], rows, b2_validation_cache_name(), threads=spec["threads"]
    )
    truth = np.array([row["label"] == "rust" for row in rows])
    return select_binary_threshold(data["probabilities"][:, 4], truth)


def evaluate_b2_rust(spec, rows, expanded):
    threshold = b2_rust_threshold(spec, expanded)
    data = runtime_predict(
        spec["artifact"], rows, "b2_external_rust", threads=spec["threads"]
    )
    truth = np.array([row["label"] == "rust" for row in rows])
    result = binary_metrics(data["probabilities"][:, 4], truth.astype(int), threshold)
    chosen, accepted, _ = decisions(
        data["probabilities"], data["quality"], spec["calibration"]
    )
    result.update(
        threshold_selection="Maximum balanced accuracy on B2 multiclass validation only; no external selection",
        app_accepted_rust_on_rust=int((accepted & (chosen == 4) & truth).sum()),
        app_accepted_rust_on_not_rust=int((accepted & (chosen == 4) & ~truth).sum()),
        all_app_accepted=int(accepted.sum()),
        all_app_accepted_coverage=float(accepted.mean()),
        status="Previously inspected external development stress test; no checkpoint or gate selection on this source",
        qualification="NoRust is binary-negative truth only; it cannot score healthy or other disease predictions",
    )
    return result


def paired_differences(test, data, selections):
    result = {}
    for first, second in [("b0", "b1"), ("b0", "b2"), ("b1", "b2")]:
        pair = {}
        for name, indices in selections.items():
            if not len(indices):
                continue
            rows = [test[int(index)] for index in indices]
            score = paired_accuracy_interval(
                rows,
                data[first]["probabilities"][indices],
                data[second]["probabilities"][indices],
            )
            score["difference"] = score.pop("b1_minus_b0")
            score.update(
                first=first, second=second, direction=f"{second}_minus_{first}"
            )
            pair[name] = score
        result[f"{second}_minus_{first}"] = pair
    return result


def benchmark_orders():
    return list(itertools.permutations(MODEL_NAMES))


def timed_invocation(runtime, raw):
    interpreter, inp, _ = runtime
    interpreter.set_tensor(inp, raw)
    started = time.perf_counter()
    interpreter.invoke()
    return (time.perf_counter() - started) * 1000


def warmed_benchmark(specs, rows, threads):
    selected = previous.benchmark_rows(rows)
    inputs = [image_input(row, "canonical") for row in selected]
    runtimes = {
        name: interpreter_for(spec["artifact"], threads) for name, spec in specs.items()
    }
    timings = {name: [] for name in MODEL_NAMES}
    positions = {name: [0, 0, 0] for name in MODEL_NAMES}
    for runtime in runtimes.values():
        for raw in inputs[:8]:
            timed_invocation(runtime, raw)
    orders = benchmark_orders()
    for repeat in range(len(orders)):
        for index, raw in enumerate(inputs):
            order = orders[(repeat + index) % len(orders)]
            for position, name in enumerate(order):
                timings[name].append(timed_invocation(runtimes[name], raw))
                positions[name][position] += 1
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
        warmup_invocations_per_model=min(8, len(inputs)),
        unique_images=len(inputs),
        repetitions=len(orders),
        invocation_positions=positions,
        image_paths=[row["path"] for row in selected],
        host=platform.node(),
        cpu=platform.processor(),
        method="Fresh same-process CPU interpreter.invoke timing; identical preloaded inputs, all six model orders per image, equal first/second/third positions; excludes loading and preprocessing",
        physical_phone_benchmarked=False,
        qualification="Run after all training/export finishes; desktop timing is not physical phone latency",
    )


def training_evidence():
    result = previous.training_evidence()
    names = [
        "training",
        "head_training",
        "export_validation",
        "completion_verification",
        "float32_conversion_parity",
        "compression_validation",
        "offline_verification",
        "incumbent_identities",
        "run_identity",
    ]
    paths = {f"b2_{name}": B2_RUN / f"{name}.json" for name in names}
    paths["b2_pretraining"] = ROOT / "models/efficientnet_b2/provenance.json"
    for name, path in paths.items():
        if path.exists():
            result[name] = dict(sha256=sha(path), report=read_json(path))
    return result


def qualifications():
    statements = previous.qualifications()
    statements[0] = (
        "B1 and B2 share the same fine-tuning recipe, vetted training data, group-preserving splits and 224px input. Their ImageNet pretrained initializations and native pretraining recipes differ, so this comparison does not isolate architecture alone. B0 uses the older corpus and coffee-specific initialization. Results compare the three deployed systems at the shared app resolution."
    )
    statements.append(
        "B0/B1 prediction caches are reused only when existing strict artifact, image-byte, preprocessing, dependency and thread signatures match. Their old reports remain unchanged; three-model latency is newly measured."
    )
    statements.append(
        "B2 was pretrained at 256px with a published 288px test setting; this experiment fine-tunes and evaluates it at the shared 224px app resolution, not its published test resolution."
    )
    return statements


def audit_inputs(original, expanded):
    audits = audit_manifests(original, expanded, verify_bytes=True)
    audits["b2"] = copy.deepcopy(audits["b1"])
    audits["b1_b2_shared_manifest"] = True
    references = reference_union(original, expanded)
    external, rust_audit = external_audit(
        read_json(ROOT / "data/multispec_binary.json"),
        references,
        "post_scale_external_audit.json",
    )
    scans, scan_audit = external_audit(
        scan_rows(), references, "post_scale_scan_audit.json"
    )
    return audits, external, scans, rust_audit, scan_audit


def evaluate_all(specs, expanded, test, selections, external, scans):
    data, results = {}, {}
    probe = group_probe_indices(test)
    for name, spec in specs.items():
        if name == "b2":
            data[name], results[name] = evaluate_b2(spec, test, selections)
            rust = evaluate_b2_rust(spec, external, expanded)
        else:
            data[name], results[name] = previous.evaluate_model(
                name, spec, test, selections
            )
            rust = previous.evaluate_rust(name, spec, external, expanded)
        results[name]["external_rust"] = rust
        results[name]["external_scans"] = previous.evaluate_scans(name, spec, scans)
        results[name]["far_probe"] = previous.evaluate_far(name, spec, test, probe)
        write_json(RUN / f"{name}_comparison.json", results[name])
    return results, paired_differences(test, data, selections)


def save_report(report, output_dir):
    write_json(RUN / "comparison.json", report)
    if output_dir:
        write_json(output_dir / "comparison.json", report)
        make_figure(report, output_dir / "comparison.png")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--audit-only", action="store_true")
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    if args.output_dir and args.output_dir.name == "model-comparison":
        raise ValueError("Use a new output directory; preserve the B0/B1 comparison")
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    original, expanded = manifest_records("manifest.json"), manifest_records()
    audits, external, scans, rust_audit, scan_audit = audit_inputs(original, expanded)
    report = dict(
        generated_at_utc=datetime.now(timezone.utc).isoformat(),
        labels=LABELS,
        manifest_audits=audits,
        external_rust_audit=rust_audit,
        external_scan_audit=scan_audit,
        source_evidence=previous.source_evidence(),
        qualifications=qualifications(),
        metric_definitions=previous.metric_definitions(),
    )
    if args.audit_only:
        write_json(RUN / "comparison_audit.json", report)
        print(
            json.dumps(
                dict(
                    audit_passed=True, external_rust_n=len(external), scan_n=len(scans)
                )
            ),
            flush=True,
        )
        return
    specs = specifications(args.threads)
    previous.validate_specs(specs)
    report["identity_before"] = identities(specs)
    test = [row for row in expanded if row["split"] == "test"]
    selections = matched_subsets(test, original)
    report["models"], report["paired_accuracy_differences"] = evaluate_all(
        specs, expanded, test, selections, external, scans
    )
    report["weak_class_comparison"] = weak_class_comparison(report["models"])
    report["training_evidence"] = training_evidence()
    report["latency"] = warmed_benchmark(specs, test, args.threads)
    report["identity_after"] = identities(specs)
    report["frozen_artifacts_and_previous_reports_unchanged"] = (
        report["identity_before"] == report["identity_after"]
    )
    if not report["frozen_artifacts_and_previous_reports_unchanged"]:
        raise ValueError(
            "A frozen artifact or previous report changed during comparison"
        )
    save_report(report, args.output_dir)
    print(
        json.dumps(
            dict(
                completed=True,
                path=str(RUN / "comparison.json"),
                matched_test_n=len(test),
            )
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
