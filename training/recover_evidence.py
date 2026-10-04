"""Recover a previously produced model report without presenting it as a rerun."""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ARTIFACT = ROOT.parent / "mobile/assets/model/coffee-leaf.tflite"
CONFIG = ARTIFACT.with_name("model-config.json")
DEFAULT_OUTPUT = ROOT / "results/final-evaluation.json"
PLANNED_FREEZE = "2026-10-04T12:00:00-07:00"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def report_path(path):
    path = Path(path)
    try:
        return str(path.relative_to(ROOT.parent))
    except ValueError:
        return str(path)


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--source-config", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def recover(source, source_config, output):
    if not source.is_file():
        raise FileNotFoundError(f"Source report does not exist: {source}")
    if not source_config.is_file():
        raise FileNotFoundError(f"Source config does not exist: {source_config}")
    report = json.loads(source.read_text())
    current_config = json.loads(CONFIG.read_text())
    source_config_data = json.loads(source_config.read_text())
    if source_config_data != current_config:
        raise ValueError("Recovered source config differs from current model config")
    current_artifact_hash = sha(ARTIFACT)
    current_config_hash = sha(CONFIG)
    source_artifact_hash = report.get("artifact_sha256")
    source_calibration_hash = report.get("calibration_sha256")
    current_calibration_hash = current_config["calibration_sha256"]
    if source_artifact_hash != current_artifact_hash:
        raise ValueError(
            "Recovered report does not describe the current model artifact"
        )
    if source_calibration_hash != current_calibration_hash:
        raise ValueError("Recovered report does not describe the current calibration")
    recovered = {
        "status": "not_reproduced",
        "evidence_type": "recovered_historical_report",
        "source_report": {
            "path": str(source),
            "sha256": sha(source),
            "values_preserved": True,
        },
        "provenance": {
            "artifact_path": report_path(ARTIFACT),
            "artifact_sha256": current_artifact_hash,
            "artifact_matches_source_report": source_artifact_hash
            == current_artifact_hash,
            "config_path": report_path(CONFIG),
            "config_sha256": current_config_hash,
            "source_config_path": str(source_config),
            "source_config_sha256": sha(source_config)
            if source_config.exists()
            else None,
            "source_config_semantically_matches": True,
            "calibration_sha256": current_calibration_hash,
            "calibration_matches_source_report": source_calibration_hash
            == current_calibration_hash,
        },
        "current_checkout": {
            "model_changed": False,
            "new_candidate_evaluated": False,
            "rerun": False,
            "freeze_status": "not_established",
            "planned_freeze": PLANNED_FREEZE,
        },
        "historical_report": report,
    }
    recovered["captured_at_utc"] = datetime.now(timezone.utc).isoformat()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(recovered, indent=2) + "\n")
    print(json.dumps(recovered["provenance"], indent=2))


def main():
    args = arguments()
    recover(args.source, args.source_config, args.output)


if __name__ == "__main__":
    main()
