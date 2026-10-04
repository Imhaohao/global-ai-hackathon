import json

import pytest

from training import recover_evidence


def make_inputs(tmp_path, monkeypatch, source_config=None):
    artifact = tmp_path / "artifact.tflite"
    artifact.write_bytes(b"artifact")
    config = tmp_path / "model-config.json"
    config_data = {"calibration_sha256": "calibration", "threshold": 0.5}
    config.write_text(json.dumps(config_data))
    monkeypatch.setattr(recover_evidence, "ARTIFACT", artifact)
    monkeypatch.setattr(recover_evidence, "CONFIG", config)
    report = tmp_path / "report.json"
    report.write_text(
        json.dumps(
            {
                "artifact_sha256": recover_evidence.sha(artifact),
                "calibration_sha256": "calibration",
                "sentinel": {"value": 7},
            }
        )
    )
    source_config_path = tmp_path / "source-config.json"
    source_config_path.write_text(
        json.dumps(config_data if source_config is None else source_config)
    )
    return report, source_config_path, tmp_path / "output.json"


def test_recovery_preserves_report_and_records_capture(tmp_path, monkeypatch):
    source, source_config, output = make_inputs(tmp_path, monkeypatch)

    recover_evidence.recover(source, source_config, output)

    wrapper = json.loads(output.read_text())
    assert wrapper["historical_report"]["sentinel"] == {"value": 7}
    assert wrapper["provenance"]["source_config_semantically_matches"] is True
    assert wrapper["current_checkout"]["freeze_status"] == "not_established"
    assert wrapper["captured_at_utc"].endswith("+00:00")


def test_recovery_rejects_config_mismatch(tmp_path, monkeypatch):
    source, source_config, output = make_inputs(
        tmp_path, monkeypatch, {"calibration_sha256": "calibration", "threshold": 0.6}
    )

    with pytest.raises(ValueError, match="source config differs"):
        recover_evidence.recover(source, source_config, output)


def test_recovery_rejects_report_hash_mismatch(tmp_path, monkeypatch):
    source, source_config, output = make_inputs(tmp_path, monkeypatch)
    source.write_text(
        json.dumps({"artifact_sha256": "wrong", "calibration_sha256": "calibration"})
    )

    with pytest.raises(ValueError, match="current model artifact"):
        recover_evidence.recover(source, source_config, output)
