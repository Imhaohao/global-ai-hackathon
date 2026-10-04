"""Time repeated single-image desktop responses after the four-model comparison."""

import argparse
import importlib.metadata
import json
import os
import platform
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from PIL import Image

import compare_model_runtime as runtime
import compare_models_b3 as comparison

ROUNDS = 3
THREADS = 4
FILENAME = "single_image_timing.json"


def selected_images():
    test = [row for row in runtime.manifest_records() if row["split"] == "test"]
    candidates = comparison.base.benchmark_rows(test)
    return [
        next(row for row in candidates if row["label"] == label)
        for label in runtime.LABELS
    ]


def image_identities(rows):
    result = []
    for row in rows:
        path = runtime.ROOT / row["path"]
        digest = runtime.sha(path)
        comparison.require(digest == row["sha256"], "Selected image bytes changed")
        with Image.open(path) as image:
            original_size, image_format = list(image.size), image.format
        result.append(
            dict(
                path=row["path"],
                label=row["label"],
                source=row["source"],
                sha256=digest,
                bytes=path.stat().st_size,
                original_size_pixels=original_size,
                original_format=image_format,
            )
        )
    return result


def code_identities():
    paths = [
        Path(__file__),
        Path(comparison.__file__),
        Path(comparison.base.__file__),
        Path(comparison.three.__file__),
        Path(runtime.__file__),
        runtime.ROOT / "export_mobile.py",
        runtime.ROOT / "calibrate_brightness.py",
        runtime.ROOT / "evaluate_additional.py",
        runtime.ROOT / "models/huyt/config.json",
        runtime.ROOT.parent / "mobile/src/diagnosis/imageQuality.ts",
    ]
    return {str(path): runtime.sha(path) for path in paths}


def completed_comparison(output_dir, specs):
    path = output_dir / "comparison.json"
    comparison.require(path.is_file(), "Wait for the main four-model comparison")
    report = runtime.read_json(path)
    comparison.require(
        report.get("frozen_artifacts_and_previous_reports_unchanged") is True,
        "Main comparison has not completed its identity verification",
    )
    comparison.require(
        set(report.get("models", {})) == set(comparison.MODEL_NAMES),
        "Main comparison does not contain all four models",
    )
    for name, spec in specs.items():
        comparison.require(
            report["models"][name]["artifact_sha256"] == runtime.sha(spec["artifact"]),
            f"{name} artifact differs from the completed comparison",
        )
    return dict(path=str(path), sha256=runtime.sha(path))


def single_response(interpreter_state, row, calibration, brightness):
    interpreter, input_index, output_index = interpreter_state
    started = time.perf_counter()
    raw = runtime.image_input(row, "canonical")
    quality = np.asarray([runtime.current_quality(row, raw, brightness, "canonical")])
    interpreter.set_tensor(input_index, raw)
    inference_started = time.perf_counter()
    interpreter.invoke()
    inference_finished = time.perf_counter()
    probabilities = interpreter.get_tensor(output_index)
    predicted, accepted, states = runtime.decisions(probabilities, quality, calibration)
    finished = time.perf_counter()
    comparison.require(
        np.isfinite(probabilities).all() and np.isfinite(quality).all(),
        "Nonfinite single-image result",
    )
    np.testing.assert_allclose(probabilities.sum(1), 1, atol=1e-4)
    return dict(
        total_response_ms=(finished - started) * 1000,
        inference_ms=(inference_finished - inference_started) * 1000,
        predicted_label=runtime.LABELS[int(predicted[0])],
        accepted=bool(accepted[0]),
        state=str(states[0]),
    )


def warmup(runtimes, specs, rows, brightness, orders):
    for index, row in enumerate(rows):
        for name in orders[index % len(orders)]:
            single_response(runtimes[name], row, specs[name]["calibration"], brightness)


def collect_trials(runtimes, specs, rows, brightness, orders):
    trials = {name: [] for name in comparison.MODEL_NAMES}
    for round_index in range(ROUNDS):
        for repeat in range(len(orders)):
            for index, row in enumerate(rows):
                order = orders[(round_index + repeat + index) % len(orders)]
                for position, name in enumerate(order):
                    measurement = single_response(
                        runtimes[name], row, specs[name]["calibration"], brightness
                    )
                    measurement.update(
                        image_index=index,
                        round=round_index + 1,
                        repetition=repeat + 1,
                        model_position=position + 1,
                    )
                    trials[name].append(measurement)
        print(json.dumps({"timing_round_complete": round_index + 1}), flush=True)
    return trials


def statistics(values):
    numbers = np.asarray(values, dtype=float)
    comparison.require(
        np.isfinite(numbers).all() and bool((numbers > 0).all()),
        "Invalid timing measurement",
    )
    return dict(
        n=len(numbers),
        mean_ms=float(numbers.mean()),
        median_ms=float(np.median(numbers)),
        p90_ms=float(np.quantile(numbers, 0.90)),
        minimum_ms=float(numbers.min()),
        maximum_ms=float(numbers.max()),
    )


def summarize_trials(trials):
    return dict(
        total_response=statistics([trial["total_response_ms"] for trial in trials]),
        inference_only=statistics([trial["inference_ms"] for trial in trials]),
    )


def model_summaries(trials, rows, specs, evidence):
    result = {}
    for name, measurements in trials.items():
        result[name] = dict(
            **summarize_trials(measurements),
            artifact_sha256=runtime.sha(specs[name]["artifact"]),
            deployment=comparison.deployment_status(name, specs[name], evidence),
            invocation_positions=dict(
                Counter(t["model_position"] for t in measurements)
            ),
            per_image=[
                dict(
                    image_index=index,
                    label=row["label"],
                    path=row["path"],
                    **summarize_trials(
                        [
                            trial
                            for trial in measurements
                            if trial["image_index"] == index
                        ]
                    ),
                )
                for index, row in enumerate(rows)
            ],
            trials=measurements,
        )
    return result


def method(rows, orders):
    return dict(
        description="Fresh single-image desktop response timing with every model already loaded",
        unique_images=len(rows),
        image_selection="First example per class from the main comparator's seeded 64-image benchmark selection; no prediction-based selection",
        rounds=ROUNDS,
        repetitions_per_image=ROUNDS * len(orders),
        timed_predictions_per_model=len(rows) * ROUNDS * len(orders),
        warmup_responses_per_model=len(rows),
        invocation_orders=orders,
        balance="Each image uses all four Williams Latin-square orders in every round; model positions and directed adjacent pairs are balanced",
        total_includes=[
            "Fresh local image open/decode and canonical resize/crop to float32 input",
            "Shared current quality helper, including reopening the image for alpha-aware exposure",
            "Input tensor transfer, model invocation, and output tensor retrieval",
            "Exact shared per-class confidence, brightness, and blur decision gate",
        ],
        inference_only="interpreter.invoke() wall time inside the same response trial",
        excludes=[
            "One-time model loading, tensor allocation, imports, and warmup",
            "Artifact/image hashing, metadata validation, result checks, and report serialization",
            "Camera capture, user selection, network, mobile bridge, and UI rendering",
        ],
        filesystem_cache="Images reopen every trial; the operating-system file cache is warm and is not flushed",
        preprocessing_note="Measures the existing desktop evaluation helpers, including their configuration read and repeated image decoding; the mobile implementation can differ",
        inference_policy="Every image invokes the model before the decision gate, including images that fail quality checks",
        num_threads=THREADS,
        torch_interop_threads=1,
        input_shape=[1, 224, 224, 3],
        input_dtype="float32",
        clock="time.perf_counter",
        host=platform.node(),
        cpu=platform.processor(),
        logical_cpus=os.cpu_count(),
        physical_phone_benchmarked=False,
        qualification="Desktop response measurements do not establish physical phone latency; repeated trials are not independent images",
    )


def execute(args, paths, evidence, specs, rows):
    main_report = completed_comparison(args.output_dir, specs)
    before = comparison.identities(specs, paths)
    image_before, code_before = image_identities(rows), code_identities()
    brightness = runtime.read_json(runtime.BRIGHTNESS)
    runtimes = {
        name: runtime.interpreter_for(spec["artifact"], THREADS)
        for name, spec in specs.items()
    }
    orders = comparison.benchmark_orders()
    warmup(runtimes, specs, rows, brightness, orders)
    trials = collect_trials(runtimes, specs, rows, brightness, orders)
    del runtimes
    after = comparison.identities(specs, paths)
    unchanged = (
        before == after
        and image_before == image_identities(rows)
        and code_before == code_identities()
        and main_report == completed_comparison(args.output_dir, specs)
    )
    comparison.require(unchanged, "Frozen benchmark inputs or comparison changed")
    report = dict(
        generated_at_utc=datetime.now(timezone.utc).isoformat(),
        method=method(rows, orders),
        images=image_before,
        models=model_summaries(trials, rows, specs, evidence),
        identity_before=before,
        identity_after=after,
        source_code_sha256=code_before,
        completed_comparison=main_report,
        frozen_inputs_and_comparison_unchanged=unchanged,
        library_versions={
            name: importlib.metadata.version(name)
            for name in ["ai-edge-litert", "numpy", "pillow", "torch", "torchvision"]
        },
    )
    runtime.write_json(comparison.RUN / FILENAME, report)
    runtime.write_json(args.output_dir / FILENAME, report)
    print(json.dumps({"completed": True, "path": str(args.output_dir / FILENAME)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--b3-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--check-ready", action="store_true")
    args = parser.parse_args()
    args.b3_dir, args.output_dir = args.b3_dir.resolve(), args.output_dir.resolve()
    comparison.require(
        args.output_dir.name == "model-comparison-all-four"
        and not args.output_dir.is_relative_to(args.b3_dir),
        "Use this chat's outputs/model-comparison-all-four directory",
    )
    paths, evidence = comparison.verify_b3_ready(args.b3_dir)
    specs = comparison.specifications(args.b3_dir, THREADS)
    rows = selected_images()
    image_identities(rows)
    if args.check_ready:
        print(json.dumps({"ready": True, "images": len(rows), "inference_run": False}))
        return
    torch.set_num_threads(THREADS)
    torch.set_num_interop_threads(1)
    execute(args, paths, evidence, specs, rows)


if __name__ == "__main__":
    main()
