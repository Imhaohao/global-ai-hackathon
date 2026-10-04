import hashlib
import json

import final_evaluation
import pytest


def fixed_model(tmp_path, monkeypatch, artifact_hash=None):
    artifact = tmp_path / "coffee-leaf.tflite"
    artifact.write_bytes(b"model fixture")
    config = {
        "artifact_sha256": artifact_hash
        or hashlib.sha256(artifact.read_bytes()).hexdigest(),
        "class_thresholds": [0.5] * 7,
    }
    metadata = tmp_path / "model-config.json"
    metadata.write_text(json.dumps({"calibration": config}))
    monkeypatch.setattr(final_evaluation, "ARTIFACT", artifact)
    return metadata, config


def test_fixed_calibration_reuses_saved_thresholds_without_rewriting(
    tmp_path, monkeypatch
):
    metadata, expected = fixed_model(tmp_path, monkeypatch)
    original = metadata.read_bytes()
    assert final_evaluation.evaluation_calibration(True) == expected
    assert metadata.read_bytes() == original


def test_fixed_calibration_rejects_a_different_artifact(tmp_path, monkeypatch):
    metadata, _ = fixed_model(tmp_path, monkeypatch, "wrong artifact hash")
    original = metadata.read_bytes()
    with pytest.raises(ValueError, match="does not match"):
        final_evaluation.evaluation_calibration(True)
    assert metadata.read_bytes() == original
