"""Evaluate four frozen models only after the separate B3 run is fully verified."""

import argparse
import copy
import gc
import hashlib
import itertools
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import timm
import torch
from safetensors.torch import load_file

import compare_models as base
import compare_models_b2 as three
from b1_model import B1Dataset
from compare_model_runtime import (
    BRIGHTNESS,
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
    group_probe_indices,
    matched_subsets,
    paired_accuracy_interval,
    source_summaries,
    subset_summaries,
    truth_for,
    weak_class_comparison,
)
from compare_models_b3_report import make_figure
from evaluate_additional import binary_metrics
from final_evaluation import select_binary_threshold

RUN = ROOT / "runs/model_comparison_b3"
MODEL_NAMES = ["b0", "b1", "b2", "b3"]
B3_REPORTS = [
    "training",
    "completion_verification",
    "export_validation",
    "offline_verification",
    "float32_conversion_parity",
    "compression_validation",
    "run_identity",
    "temperature",
    "calibration",
]
B3_SCRIPTS = [
    "b3_model.py",
    "b3_train.py",
    "b3_verify.py",
    "export_b3.py",
    "verify_b3_offline.py",
]
# Reviewed change: completed-run reuse checks plus an existing history assignment.
# Pin both versions so this does not permit arbitrary future wrapper changes.
B3_REVIEWED_WRAPPER_HASHES = (
    "c9ede75ea24d55d93538459078f284ae5272ed8d4b9ec95fc58c043a77dd90f2",
    "ee5eb50f53c45ffe4815865b349e1b57a80c48daa7ef3292f684510459c5047c",
)


def require(condition, explanation):
    if not condition:
        raise ValueError(explanation)


def b3_paths(directory):
    paths = {name: directory / "run" / f"{name}.json" for name in B3_REPORTS}
    audit = directory / "run/orchestration_change_audit.json"
    if audit.is_file():
        paths["orchestration_change_audit"] = audit
    paths.update({name: directory / name for name in B3_SCRIPTS})
    paths.update(
        checkpoint=directory / "run/best.safetensors",
        artifact=directory / "coffee-leaf-b3.tflite",
        config=directory / "model-config-b3.json",
        provenance=directory / "pretrained/provenance.json",
    )
    return paths


def verify_b3_shared_code(identity, evidence):
    shared = identity.get("shared_code_sha256", {})
    require(bool(shared), "B3 shared-code identity is missing")
    current = {name: sha(ROOT / name) for name in shared}
    changed = {name for name in shared if current[name] != shared[name]}
    if not changed:
        return
    require(changed == {"b2_train.py"}, "B3 shared recipe changed after training")
    versions = shared["b2_train.py"], current["b2_train.py"]
    require(
        versions == B3_REVIEWED_WRAPPER_HASHES,
        "B3 shared wrapper change is not the exact reviewed change",
    )
    audit = evidence.get("orchestration_change_audit", {})
    require(
        audit.get("matches_original") is True
        and audit.get("original_hash") == versions[0]
        and audit.get("current_hash") == versions[1]
        and versions[0] in audit.get("reconstructed_hashes", []),
        "B3 exact wrapper reconstruction audit is missing or inconsistent",
    )
    records = [
        evidence["completion_verification"],
        evidence["training"].get("completion_verification", {}),
    ]
    require(
        all(record.get("orchestration_source_change") == audit for record in records),
        "B3 completion evidence does not corroborate the wrapper audit",
    )


def verify_b3_training(paths, evidence):
    training, verified, identity = (
        evidence[name]
        for name in ["training", "completion_verification", "run_identity"]
    )
    checkpoint = sha(paths["checkpoint"])
    manifest = sha(ROOT / "data/scale_v3_manifest.json")
    require(training.get("status") == "complete", "B3 training has not completed")
    require(
        training.get("architecture") == "efficientnet_b3"
        and training.get("input_size") == 224,
        "B3 training contract differs",
    )
    require(
        training.get("shared_recipe_unchanged") is True
        and verified.get("shared_recipe_unchanged") is True,
        "B3 shared-recipe verification is missing",
    )
    require(
        not verified.get("mismatches", ["missing"]),
        "B3 training image verification failed or is missing",
    )
    for record in [training, verified]:
        require(
            record.get("checkpoint_sha256") == checkpoint,
            "B3 selected checkpoint changed after verification",
        )
        require(
            record.get("manifest_sha256") == manifest,
            "B3 verified manifest differs from the shared manifest",
        )
    require(
        identity.get("manifest_sha256") == manifest,
        "B3 run identity has a different manifest",
    )
    require(
        identity.get("model_code_sha256") == sha(paths["b3_model.py"]),
        "B3 model code changed",
    )
    require(
        identity.get("wrapper_sha256") == sha(paths["b3_train.py"]),
        "B3 training wrapper changed",
    )
    verify_b3_shared_code(identity, evidence)


def verify_b3_export(paths, evidence):
    config, export, offline = (
        evidence[name]
        for name in ["config", "export_validation", "offline_verification"]
    )
    artifact, checkpoint = sha(paths["artifact"]), sha(paths["checkpoint"])
    require(
        config.get("labels") == LABELS
        and config.get("input_size") == 224
        and config.get("crop_pct") == 0.875,
        "B3 export input/label contract differs",
    )
    require(
        config.get("architecture") == "efficientnet_b3",
        "B3 export architecture differs",
    )
    for record in [config, export, evidence["float32_conversion_parity"]]:
        require(
            record.get("checkpoint_sha256") == checkpoint,
            "B3 export evidence is for a different checkpoint",
        )
    for record in [export, offline, config["calibration"]]:
        require(
            record.get("artifact_sha256") == artifact,
            "B3 export/offline evidence is for a different artifact",
        )
    require(
        config.get("calibration_sha256") == sha(paths["calibration"]),
        "B3 deployed calibration changed",
    )
    require(
        config["calibration"] == evidence["calibration"],
        "B3 config and calibration disagree",
    )
    require(
        config["calibration"].get("brightness_config_sha256") == sha(BRIGHTNESS),
        "B3 quality policy changed",
    )
    require(
        export.get("test_or_external_used_for_selection") is False,
        "B3 selection audit is missing",
    )
    require(
        export.get("bytes") == paths["artifact"].stat().st_size,
        "B3 artifact size changed",
    )
    verify_b3_deployment(paths, evidence)
    verify_b3_fidelity(evidence)
    verify_b3_offline(offline)


def verify_b3_deployment(paths, evidence):
    config, export = evidence["config"], evidence["export_validation"]
    eligible = paths["artifact"].stat().st_size < 10_000_000
    require(export.get("size_limit_bytes") == 10_000_000, "B3 app size limit changed")
    require(
        config.get("deployment_eligible") is eligible
        and export.get("deployment_eligible") is eligible,
        "B3 recorded deployment eligibility does not match actual size",
    )
    require(
        config.get("manifest_sha256") == sha(ROOT / "data/scale_v3_manifest.json"),
        "B3 export manifest differs",
    )
    provenance = evidence["provenance"]
    for key, config_key in [
        ("repository", "model_repository"),
        ("revision", "model_revision"),
    ]:
        expected = provenance.get(key)
        require(
            bool(expected) and config.get(config_key) == expected,
            f"B3 export {key} differs from provenance",
        )
        require(
            evidence["training"].get("pretrained", {}).get(key) == expected,
            f"B3 training {key} differs from provenance",
        )
    require(
        evidence["offline_verification"].get("installed_in_app")
        == export.get("installed_in_app"),
        "B3 installation evidence disagrees",
    )


def verify_b3_fidelity(evidence):
    candidates = evidence["export_validation"].get("compression_candidates", [])
    require(bool(candidates), "B3 compression verification is missing")
    require(
        candidates == evidence["compression_validation"],
        "B3 compression evidence differs from final export",
    )
    require(
        candidates[-1].get("parity", {}).get("eligible") is True,
        "Final B3 compression failed validation fidelity",
    )
    fp32 = evidence["float32_conversion_parity"]
    require(
        fp32.get("validation_samples", 0) > 0 and fp32.get("top1_disagreements") == 0,
        "B3 FP32 conversion is not verified",
    )
    require(
        fp32.get("maximum_probability_error", 1) <= 0.0002,
        "B3 FP32 conversion exceeds its fidelity bound",
    )


def verify_b3_offline(offline):
    require(
        offline.get("fresh_process") is True
        and offline.get("python_outbound_sockets_blocked") is True,
        "B3 fresh-process offline verification is missing",
    )
    require(
        offline.get("attempted_connections") == 0
        and offline.get("custom_ops_present") is False,
        "B3 offline/builtin-op verification failed",
    )
    require(
        offline.get("samples", 0) > 0,
        "B3 offline verification has no inference samples",
    )


def verify_b3_ready(directory):
    paths = b3_paths(directory)
    missing = [str(path) for path in paths.values() if not path.is_file()]
    require(
        not missing,
        "Wait for B3 completion/export verification; missing: " + ", ".join(missing),
    )
    evidence = {
        name: read_json(paths[name]) for name in B3_REPORTS + ["config", "provenance"]
    }
    if "orchestration_change_audit" in paths:
        evidence["orchestration_change_audit"] = read_json(
            paths["orchestration_change_audit"]
        )
    verify_b3_training(paths, evidence)
    verify_b3_export(paths, evidence)
    return paths, evidence


def load_b3_checkpoint(checkpoint):
    model = timm.create_model(
        "efficientnet_b3", pretrained=False, num_classes=len(LABELS)
    )
    model.load_state_dict(load_file(str(checkpoint)), strict=True)
    return model


def specifications(directory, threads):
    specs = three.specifications(threads)
    specs["b3"] = dict(
        artifact=directory / "coffee-leaf-b3.tflite",
        config=directory / "model-config-b3.json",
        checkpoint=directory / "run/best.safetensors",
        loader=load_b3_checkpoint,
        dataset=B1Dataset,
        threads=threads,
        directory=directory,
    )
    base.validate_specs(specs)
    for name in ["b0", "b1", "b2"]:
        require(
            specs[name]["artifact"].stat().st_size < 10_000_000,
            f"{name.upper()} app asset exceeds the unchanged 10 MB limit",
        )
    return specs


def identities(specs, b3_files):
    result = three.identities(specs)
    paths = {f"b3_{name}": path for name, path in b3_files.items()}
    paths.update(
        {
            f"previous_b2_{path.name}": path
            for path in three.RUN.glob("*comparison.json")
        }
    )
    for name, path in paths.items():
        result[name] = dict(path=str(path), sha256=sha(path), bytes=path.stat().st_size)
    return result


def checkpoint_signature(spec, rows):
    digest = hashlib.sha256(
        cache_signature(
            spec["checkpoint"], rows, "checkpoint", spec["threads"]
        ).encode()
    )
    paths = [
        Path(__file__),
        spec["config"],
        spec["directory"] / "b3_model.py",
        ROOT / "b1_model.py",
        ROOT / "model_utils.py",
    ]
    for path in paths:
        digest.update(bytes.fromhex(sha(path)))
    return digest.hexdigest()


def predict_b3_checkpoint(spec, rows):
    cache = CACHE_RUN / "b3_checkpoint_test.npz"
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
                    "b3 checkpoint",
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


def evaluate_b3(spec, rows, selections):
    data = runtime_predict(spec["artifact"], rows, "b3_test", threads=spec["threads"])
    checkpoint, parameters = predict_b3_checkpoint(spec, rows)
    result = dict(
        parameter_count=parameters,
        artifact_bytes=spec["artifact"].stat().st_size,
        under_10_decimal_MB=spec["artifact"].stat().st_size < 10_000_000,
        artifact_sha256=sha(spec["artifact"]),
        checkpoint_sha256=sha(spec["checkpoint"]),
        subsets=subset_summaries(data, rows, spec["calibration"], selections),
        per_source=source_summaries(data, rows, spec["calibration"]),
        checkpoint_runtime_parity=base.parity_report(
            checkpoint, data, spec["calibration"]
        ),
        legacy_brightness_app_metrics=gate_metrics(
            data["probabilities"],
            data["quality"],
            truth_for(rows),
            spec["calibration"],
            legacy=True,
        ),
        class_thresholds=spec["calibration"]["class_thresholds"],
        confident_thresholds=spec["calibration"]["confident_thresholds"],
        calibration=spec["calibration"],
    )
    return data, result


def b3_validation_scores(spec, rows, evidence):
    variant = evidence["export_validation"]["compression_candidates"][-1]["variant"]
    name = f"b3_validation_{variant}"
    external_cache = (
        spec["directory"] / "run/comparison_cache" / f"{name}_canonical.npz"
    )
    if external_cache.is_file():
        expected = cache_signature(spec["artifact"], rows, "canonical", spec["threads"])
        with np.load(external_cache) as stored:
            if str(stored["signature"]) == expected:
                return stored["probabilities"]
    return runtime_predict(spec["artifact"], rows, name, threads=spec["threads"])[
        "probabilities"
    ]


def evaluate_b3_rust(spec, rows, expanded, evidence):
    validation = [row for row in expanded if row["split"] == "val"]
    scores = b3_validation_scores(spec, validation, evidence)
    threshold = select_binary_threshold(
        scores[:, 4], np.array([row["label"] == "rust" for row in validation])
    )
    data = runtime_predict(
        spec["artifact"], rows, "b3_external_rust", threads=spec["threads"]
    )
    truth = np.array([row["label"] == "rust" for row in rows])
    result = binary_metrics(data["probabilities"][:, 4], truth.astype(int), threshold)
    chosen, accepted, _ = decisions(
        data["probabilities"], data["quality"], spec["calibration"]
    )
    result.update(
        threshold_selection="Maximum balanced accuracy on B3 validation only; no external selection",
        app_accepted_rust_on_rust=int((accepted & (chosen == 4) & truth).sum()),
        app_accepted_rust_on_not_rust=int((accepted & (chosen == 4) & ~truth).sum()),
        all_app_accepted=int(accepted.sum()),
        all_app_accepted_coverage=float(accepted.mean()),
        status="Previously inspected external development stress test; no selection on this source",
        qualification="NoRust is binary-negative truth only, not a healthy label; candidate gate metrics are computed offline",
    )
    return result


def paired_differences(rows, data, selections):
    result = {}
    for first, second in itertools.combinations(MODEL_NAMES, 2):
        pair = {}
        for name, indices in selections.items():
            if not len(indices):
                continue
            chosen = [rows[int(index)] for index in indices]
            score = paired_accuracy_interval(
                chosen,
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
    first = [0, 1, 3, 2]
    return [
        tuple(MODEL_NAMES[(value + rotation) % 4] for value in first)
        for rotation in range(4)
    ]


def warmed_benchmark(specs, rows, threads):
    selected = base.benchmark_rows(rows)
    inputs = [image_input(row, "canonical") for row in selected]
    runtimes = {
        name: interpreter_for(spec["artifact"], threads) for name, spec in specs.items()
    }
    timings = {name: [] for name in MODEL_NAMES}
    for runtime in runtimes.values():
        for raw in inputs[:8]:
            three.timed_invocation(runtime, raw)
    orders = benchmark_orders()
    for repeat in range(len(orders)):
        for index, raw in enumerate(inputs):
            for name in orders[(repeat + index) % len(orders)]:
                timings[name].append(three.timed_invocation(runtimes[name], raw))
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
        repetitions=4,
        invocation_orders=orders,
        image_paths=[row["path"] for row in selected],
        host=platform.node(),
        cpu=platform.processor(),
        method="Fresh same-process CPU invoke timing; identical preloaded images; four Williams Latin-square orders per image balance every position and every directed adjacent pair; excludes loading/preprocessing",
        physical_phone_benchmarked=False,
        qualification="Measure after all training/export completes; never use cached timings or infer phone latency",
    )


def evaluate_all(specs, expanded, rows, selections, external, scans, evidence):
    data, results = {}, {}
    probe = group_probe_indices(rows)
    for name, spec in specs.items():
        if name == "b3":
            data[name], results[name] = evaluate_b3(spec, rows, selections)
            rust = evaluate_b3_rust(spec, external, expanded, evidence)
        elif name == "b2":
            data[name], results[name] = three.evaluate_b2(spec, rows, selections)
            rust = three.evaluate_b2_rust(spec, external, expanded)
        else:
            data[name], results[name] = base.evaluate_model(
                name, spec, rows, selections
            )
            rust = base.evaluate_rust(name, spec, external, expanded)
        results[name].update(
            external_rust=rust,
            external_scans=base.evaluate_scans(name, spec, scans),
            far_probe=base.evaluate_far(name, spec, rows, probe),
        )
        results[name]["deployment"] = deployment_status(name, spec, evidence)
        write_json(RUN / f"{name}_comparison.json", results[name])
    return results, paired_differences(rows, data, selections)


def deployment_status(name, spec, evidence):
    if name != "b3":
        return dict(
            role="app_asset",
            artifact_location=str(spec["artifact"]),
            deployment_eligible=spec["artifact"].stat().st_size < 10_000_000,
        )
    export = evidence["export_validation"]
    return dict(
        role="app_asset" if export.get("installed_in_app") else "comparison_candidate",
        installed_in_app=export.get("installed_in_app", False),
        deployment_eligible=export["deployment_eligible"],
        artifact_location=str(spec["artifact"]),
        note=evidence["config"]["deployment_note"],
        gates="Candidate decisions apply the same app policy offline; model choice in the app is not implied",
    )


def qualifications():
    notes = three.qualifications()
    notes[0] = (
        "B1/B2/B3 share the same fine-tuning recipe, vetted data, group-preserving splits, seed and 224px inputs. Their pretrained ImageNet initializations and native pretraining recipes differ. B0 uses the older corpus and coffee-specific initialization. This compares trained systems rather than isolating architecture."
    )
    notes.append(
        "B3 may be a validated comparison candidate above the unchanged 10 MB app limit. Deployment status is explicit; reported candidate gate metrics simulate app decisions offline and do not indicate installation."
    )
    notes.append(
        "B3 native pretraining/test resolutions are 288/320px; these results measure the shared 224px contract, not published native-resolution performance."
    )
    return notes


def b3_evidence(paths, evidence):
    result = three.training_evidence()
    for name, value in evidence.items():
        result[f"b3_{name}"] = dict(sha256=sha(paths[name]), report=value)
    for name in B3_SCRIPTS:
        result[name] = dict(path=str(paths[name]), sha256=sha(paths[name]))
    return result


def execute(args, paths, evidence):
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    specs = specifications(args.b3_dir, args.threads)
    before = identities(specs, paths)
    original, expanded = manifest_records("manifest.json"), manifest_records()
    audits, external, scans, rust_audit, scan_audit = three.audit_inputs(
        original, expanded
    )
    audits["b3"] = copy.deepcopy(audits["b1"])
    audits["b1_b2_b3_shared_manifest"] = True
    rows = [row for row in expanded if row["split"] == "test"]
    selections = matched_subsets(rows, original)
    models, intervals = evaluate_all(
        specs, expanded, rows, selections, external, scans, evidence
    )
    report = dict(
        generated_at_utc=datetime.now(timezone.utc).isoformat(),
        labels=LABELS,
        models=models,
        paired_accuracy_differences=intervals,
        identity_before=before,
        manifest_audits=audits,
        external_rust_audit=rust_audit,
        external_scan_audit=scan_audit,
        source_evidence=base.source_evidence(),
        training_evidence=b3_evidence(paths, evidence),
        metric_definitions=base.metric_definitions(),
        qualifications=qualifications(),
        weak_class_comparison=weak_class_comparison(models),
        latency=warmed_benchmark(specs, rows, args.threads),
    )
    report["identity_after"] = identities(specs, paths)
    report["frozen_artifacts_and_previous_reports_unchanged"] = (
        before == report["identity_after"]
    )
    require(
        report["frozen_artifacts_and_previous_reports_unchanged"],
        "An artifact, B3 evidence or previous report changed during evaluation",
    )
    write_json(RUN / "comparison.json", report)
    if args.output_dir:
        write_json(args.output_dir / "comparison.json", report)
        make_figure(report, args.output_dir / "comparison.png")
    print(
        json.dumps(
            dict(
                completed=True,
                path=str(RUN / "comparison.json"),
                matched_test_n=len(rows),
            )
        ),
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--b3-dir", required=True, type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--check-ready", action="store_true")
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    args.b3_dir = args.b3_dir.resolve()
    require(
        not args.output_dir
        or not args.output_dir.resolve().is_relative_to(args.b3_dir),
        "B3 files are read-only; use this chat's output directory",
    )
    require(
        not args.output_dir
        or args.output_dir.name not in {"model-comparison", "model-comparison-b2"},
        "Preserve old comparison directories; choose model-comparison-all-four",
    )
    paths, evidence = verify_b3_ready(args.b3_dir)
    if args.check_ready:
        print(
            json.dumps(
                dict(
                    b3_ready=True,
                    artifact_sha256=evidence["export_validation"]["artifact_sha256"],
                    inference_run=False,
                )
            )
        )
        return
    execute(args, paths, evidence)


if __name__ == "__main__":
    main()
