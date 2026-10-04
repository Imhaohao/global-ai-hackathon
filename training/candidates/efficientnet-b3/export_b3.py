"""Validate B3 with B2's export recipe while retaining the existing app size gate."""

import json
import shutil

from b3_model import (
    HOME,
    MANIFEST,
    REPOSITORY,
    REVISION,
    ROOT,
    RUN,
    load_model,
    private_module,
)

import compare_model_runtime as runtime

runtime.RUN = RUN / "comparison_cache"
ASSETS = ROOT.parent / "mobile/assets/model"
SIZE_LIMIT = 10_000_000


def export_engine():
    engine = private_module("export_b1.py", "_b3_shared_export_engine")
    engine.RUN, engine.load_model = RUN, load_model
    return engine


def compressed_candidate(engine, source, preserve_head):
    try:
        return engine.compress_weights(source, preserve_head)
    except AssertionError:
        variant = "head_fp32" if preserve_head else "int8_weights"
        artifact = source.parent / f"phone_{variant}.tflite"
        if not artifact.exists() or artifact.stat().st_size < SIZE_LIMIT:
            raise
        return artifact, dict(variant=variant, bytes=artifact.stat().st_size)


def select_compression(engine, source, expected, truth, rows):
    candidates = []
    for preserve_head in [False, True]:
        artifact, metadata = compressed_candidate(engine, source, preserve_head)
        data = runtime.runtime_predict(
            artifact, rows, f"b3_validation_{metadata['variant']}"
        )
        parity = engine.compression_metrics(expected, data["probabilities"], truth)
        metadata.update(
            parity=parity,
            under_10_decimal_MB=metadata["bytes"] < SIZE_LIMIT,
            deployment_eligible=parity["eligible"] and metadata["bytes"] < SIZE_LIMIT,
        )
        candidates.append(metadata)
        runtime.write_json(RUN / "compression_validation.json", candidates)
        if parity["eligible"]:
            return artifact, data, candidates
    raise RuntimeError("B3 does not meet the unchanged validation fidelity gate")


def publish_candidate(artifact, calibration, model, candidates, temperature):
    calibration.update(
        runtime="LiteRT CPU int8 per-channel weight storage / float32 computation",
        artifact_sha256=runtime.sha(artifact),
        brightness_config_sha256=runtime.sha(runtime.BRIGHTNESS),
        version="b3-candidate-v1",
        temperature=temperature,
        selection="Same B2 validation-only compressed runtime and shared brightness policy; >=15 accepted and >=90%/95% precision per class",
    )
    runtime.write_json(RUN / "calibration.json", calibration)
    eligible = artifact.stat().st_size < SIZE_LIMIT
    config = dict(
        labels=runtime.LABELS,
        app_condition_keys=runtime.read_json(ASSETS / "model-config.json")[
            "app_condition_keys"
        ],
        calibration=calibration,
        input="float32 raw RGB 0..255 NHWC",
        crop_pct=0.875,
        architecture="efficientnet_b3",
        input_size=224,
        model_repository=REPOSITORY,
        model_revision=REVISION,
        manifest_sha256=runtime.sha(MANIFEST),
        checkpoint_sha256=runtime.sha(RUN / "best.safetensors"),
        calibration_sha256=runtime.sha(RUN / "calibration.json"),
        deployment_eligible=eligible,
        deployment_note="Validated comparison candidate; requires app integration"
        if eligible
        else "Validated comparison candidate exceeds the unchanged 10 MB app-artifact limit; not installed in app",
    )
    destination = HOME / "coffee-leaf-b3.tflite"
    temporary = destination.with_suffix(".tflite.partial")
    shutil.copyfile(artifact, temporary)
    assert runtime.sha(temporary) == calibration["artifact_sha256"]
    temporary.replace(destination)
    runtime.write_json(HOME / "model-config-b3.json", config)
    report = dict(
        artifact_sha256=runtime.sha(destination),
        checkpoint_sha256=runtime.sha(RUN / "best.safetensors"),
        parameter_count=sum(p.numel() for p in model.parameters()),
        bytes=destination.stat().st_size,
        compression_candidates=candidates,
        deployment_eligible=eligible,
        size_limit_bytes=SIZE_LIMIT,
        installed_in_app=False,
        test_or_external_used_for_selection=False,
        phone_device_tested=False,
        export_recipe_sha256=runtime.sha(ROOT / "export_b1.py"),
    )
    runtime.write_json(RUN / "export_validation.json", report)
    print(json.dumps(report, indent=2), flush=True)


def main():
    adapter = private_module("export_b2.py", "_b3_b2_export_recipe")
    adapter.RUN, adapter.MANIFEST = RUN, MANIFEST
    adapter.REPOSITORY, adapter.REVISION = REPOSITORY, REVISION
    adapter.load_model, adapter.export_engine = load_model, export_engine
    adapter.select_compression, adapter.publish = select_compression, publish_candidate
    adapter.main()
    adapter.incumbent_identities()


if __name__ == "__main__":
    main()
