"""Apply the frozen B1 export recipe to B2 without touching either incumbent."""

import copy
import importlib.util
import json
import shutil

import numpy as np
import torch

from b2_model import MANIFEST, REPOSITORY, REVISION, RUN, load_model
from compare_model_runtime import (
    BRIGHTNESS,
    LABELS,
    ROOT,
    class_thresholds,
    manifest_records,
    read_json,
    runtime_predict,
    sha,
    write_json,
)

ASSETS = ROOT.parent / "mobile/assets/model"


def export_engine():
    specification = importlib.util.spec_from_file_location(
        "b2_export_recipe", ROOT / "export_b1.py"
    )
    engine = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(engine)
    engine.RUN = RUN
    engine.load_model = load_model
    return engine


def incumbent_identities():
    record = RUN / "incumbent_identities.json"
    if not record.exists():
        names = [
            "coffee-leaf.tflite",
            "coffee-leaf-b1.tflite",
            "model-config.json",
            "model-config-b1.json",
            "brightness-config.json",
        ]
        saved = {
            str((ASSETS / name).relative_to(ROOT.parent)): dict(
                sha256=sha(ASSETS / name), bytes=(ASSETS / name).stat().st_size
            )
            for name in names
        }
        write_json(record, saved)
    saved = read_json(record)
    for name, expected in saved.items():
        path = ROOT.parent / name
        if sha(path) != expected["sha256"]:
            raise ValueError(f"Incumbent changed since B2 preparation: {name}")
    return saved


def compressed_candidate(engine, source, preserve_head):
    try:
        return engine.compress_weights(source, preserve_head)
    except AssertionError:
        variant = "head_fp32" if preserve_head else "int8_weights"
        path = source.parent / f"phone_{variant}.tflite"
        if not path.exists() or path.stat().st_size < 10_000_000:
            raise
        return path, dict(variant=variant, bytes=path.stat().st_size)


def select_compression(engine, source, expected, truth, rows):
    candidates = []
    for preserve_head in [False, True]:
        artifact, metadata = compressed_candidate(engine, source, preserve_head)
        if metadata["bytes"] >= 10_000_000:
            candidates.append(
                dict(
                    **metadata, parity=dict(eligible=False, reason="File exceeds 10 MB")
                )
            )
            write_json(RUN / "compression_validation.json", candidates)
            continue
        data = runtime_predict(artifact, rows, f"b2_validation_{metadata['variant']}")
        parity = engine.compression_metrics(expected, data["probabilities"], truth)
        candidates.append(dict(**metadata, parity=parity))
        write_json(RUN / "compression_validation.json", candidates)
        if parity["eligible"]:
            return artifact, data, candidates
    raise RuntimeError(
        "No B2 export meets the fixed size and validation fidelity limits"
    )


def model_config(calibration):
    return dict(
        labels=LABELS,
        app_condition_keys=read_json(ASSETS / "model-config.json")[
            "app_condition_keys"
        ],
        calibration=calibration,
        input="float32 raw RGB 0..255 NHWC",
        crop_pct=0.875,
        architecture="efficientnet_b2",
        input_size=224,
        model_repository=REPOSITORY,
        model_revision=REVISION,
        manifest_sha256=sha(MANIFEST),
        checkpoint_sha256=sha(RUN / "best.safetensors"),
        calibration_sha256=sha(RUN / "calibration.json"),
    )


def publish(artifact, calibration, model, candidates, temperature):
    incumbent_identities()
    calibration.update(
        runtime="LiteRT CPU int8 per-channel weight storage / float32 computation",
        artifact_sha256=sha(artifact),
        brightness_config_sha256=sha(BRIGHTNESS),
        version="b2-deployed-v1",
        temperature=temperature,
        selection=(
            "Validation-only compressed runtime, current shared brightness policy; "
            ">=15 accepted and >=90%/95% precision per class"
        ),
    )
    write_json(RUN / "calibration.json", calibration)
    config = model_config(calibration)
    destination = ASSETS / "coffee-leaf-b2.tflite"
    temporary = destination.with_suffix(".tflite.partial")
    shutil.copyfile(artifact, temporary)
    if sha(temporary) != calibration["artifact_sha256"]:
        raise ValueError("B2 asset copy failed hash verification")
    temporary.replace(destination)
    config_path = ASSETS / "model-config-b2.json"
    temporary_config = config_path.with_suffix(".json.partial")
    write_json(temporary_config, config)
    temporary_config.replace(config_path)
    report = dict(
        artifact_sha256=sha(destination),
        checkpoint_sha256=sha(RUN / "best.safetensors"),
        parameter_count=sum(parameter.numel() for parameter in model.parameters()),
        bytes=destination.stat().st_size,
        compression_candidates=candidates,
        test_or_external_used_for_selection=False,
        phone_device_tested=False,
        incumbents_unchanged=incumbent_identities(),
        export_recipe_sha256=sha(ROOT / "export_b1.py"),
    )
    write_json(RUN / "export_validation.json", report)
    print(json.dumps(report, indent=2), flush=True)


def validation_input():
    report = read_json(RUN / "training.json")
    verification = read_json(RUN / "completion_verification.json")
    checkpoint_sha = sha(RUN / "best.safetensors")
    if report["status"] != "complete":
        raise ValueError("B2 training must finish before export")
    if checkpoint_sha != report["checkpoint_sha256"]:
        raise ValueError("Selected B2 checkpoint changed after training")
    if checkpoint_sha != verification["checkpoint_sha256"]:
        raise ValueError("Selected B2 checkpoint was not verified")
    if sha(MANIFEST) != verification["manifest_sha256"]:
        raise ValueError("B2 manifest changed after verification")
    rows = [row for row in manifest_records() if row["split"] == "val"]
    truth = np.array([LABELS.index(row["label"]) for row in rows])
    with np.load(RUN / "selected_validation.npz") as stored:
        np.testing.assert_array_equal(stored["labels"], truth)
        np.testing.assert_array_equal(stored["paths"], [row["path"] for row in rows])
        logits = stored["logits"].copy()
    return rows, truth, logits


def main():
    torch.set_num_threads(8)
    torch.set_num_interop_threads(1)
    incumbent_identities()
    engine = export_engine()
    rows, truth, logits = validation_input()
    temperature = engine.fit_temperature(logits, truth)
    expected = torch.softmax(torch.as_tensor(logits) / temperature, 1).numpy()
    source, model = engine.float32_export(temperature)
    engine.verify_float_graph(source, expected, truth, rows)
    artifact, data, candidates = select_compression(
        engine, source, expected, truth, rows
    )
    calibration = dict(
        quality=copy.deepcopy(
            read_json(ASSETS / "model-config.json")["calibration"]["quality"]
        ),
        validation_n=len(rows),
    )
    calibration.update(
        class_thresholds(data["probabilities"], data["quality"], truth, calibration)
    )
    publish(artifact, calibration, model, candidates, temperature)


if __name__ == "__main__":
    main()
