import argparse
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TIMING = re.compile(r"\[leaf-model\] inference_ms=([0-9.]+) quality=(true|false)")


def percentile(values, fraction):
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def summarize_log(log):
    samples = [
        {"inference_ms": float(match[1]), "quality_passed": match[2] == "true"}
        for match in TIMING.finditer(log)
    ]
    values = [sample["inference_ms"] for sample in samples]
    if len(values) < 30:
        raise ValueError(f"Need at least 30 inference timings; found {len(values)}")
    if any(not math.isfinite(value) or value <= 0 for value in values):
        raise ValueError("Inference timings must be finite and positive")
    return {
        "sample_count": len(samples),
        "median_ms": percentile(values, 0.5),
        "p90_ms": percentile(values, 0.9),
        "slowest_ms": max(values),
        "percentile_method": "linear interpolation at (n - 1) * percentile",
        "samples": samples,
    }


def build_report(log, metadata, artifact, config):
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    if digest != metadata["artifact_sha256"] or digest != config["calibration"]["artifact_sha256"]:
        raise ValueError("Benchmark metadata and current model hashes must match")
    config_digest = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    if config_digest != metadata["model_config_signature"]:
        raise ValueError("Model configuration changed since the benchmark was prepared")
    if len(metadata["photos"]) != 6:
        raise ValueError("The benchmark requires six credited photos")
    return {
        **metadata,
        **summarize_log(log),
        "model_version": config["calibration"]["version"],
        "artifact_bytes": artifact.stat().st_size,
        "log_sha256": hashlib.sha256(log.encode()).hexdigest(),
        "reported_at_utc": datetime.now(timezone.utc).isoformat(),
        "timing_scope": "Only awaited model.run; excludes photo preparation, quality gate and result UI",
        "device_type": "Android emulator; not a physical phone",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "results/model-speed.json")
    args = parser.parse_args()
    artifact = ROOT.parent / "mobile/assets/model/coffee-leaf.tflite"
    config = json.loads((artifact.parent / "model-config.json").read_text())
    report = build_report(args.log.read_text(), json.loads(args.metadata.read_text()), artifact, config)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps({key: report[key] for key in ["sample_count", "median_ms", "p90_ms", "slowest_ms"]}))


if __name__ == "__main__":
    main()
