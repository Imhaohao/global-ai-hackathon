"""Calibrate capture exposure from supported training images, without model changes."""

import hashlib
import io
import json
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "data/manifest.json"
OUTPUT = ROOT / "runs/brightness_v1"
CONFIG = ROOT.parent / "mobile/assets/model/brightness-config.json"
HIGHLIGHT = 250
INPUT_SIZE = 224
EXPOSURES = {"clean": 1.0, "dark_10_percent": 0.1, "bright_4_times": 4.0}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def crop_rgba(image, short_side):
    width, height = image.size
    scale = short_side / min(width, height)
    width, height = int(width * scale), int(height * scale)
    resized = image.convert("RGBA").resize((width, height), Image.Resampling.BICUBIC)
    left = int((width - INPUT_SIZE) / 2 + 0.5)
    top = int((height - INPUT_SIZE) / 2 + 0.5)
    return np.asarray(resized.crop((left, top, left + INPUT_SIZE, top + INPUT_SIZE)))


def exposure_features(rgba, multiplier=1.0):
    rgb = np.clip(rgba[:, :, :3].astype(np.float64) * multiplier, 0, 255).astype(
        np.uint32
    )
    gray = (
        19595 * rgb[:, :, 0] + 38470 * rgb[:, :, 1] + 7471 * rgb[:, :, 2] + 32768
    ) // 65536
    alpha = rgba[:, :, 3].astype(np.float64)
    total = float(alpha.sum())
    if total == 0:
        raise ValueError("Cannot measure exposure in an entirely transparent image")
    return {
        "mean_luminance": float((gray * alpha).sum() / total),
        "highlight_fraction": float(((gray >= HIGHLIGHT) * alpha).sum() / total),
        "visible_fraction": float(alpha.mean() / 255),
    }


def measure_row(row, short_side, challenges):
    payload = (ROOT / row["path"]).read_bytes()
    actual_sha = hashlib.sha256(payload).hexdigest()
    if row.get("sha256") and row["sha256"] != actual_sha:
        raise ValueError(f"Image bytes no longer match the manifest: {row['path']}")
    with Image.open(io.BytesIO(payload)) as image:
        rgba = crop_rgba(image, short_side)
    variants = EXPOSURES if challenges else {"clean": 1.0}
    return {
        **{key: row[key] for key in ("path", "source", "parent", "group", "label")},
        "sha256": actual_sha,
        "features": {
            name: exposure_features(rgba, factor) for name, factor in variants.items()
        },
    }


def measure_rows(rows, short_side, challenges=False):
    def worker(row):
        return measure_row(row, short_side, challenges)

    with ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(worker, rows))


def balanced_weights(rows):
    groups = defaultdict(set)
    parents = defaultdict(set)
    counts = Counter()
    for row in rows:
        source, group, parent = row["source"], row["group"], row["parent"]
        groups[source].add(group)
        parents[source, group].add(parent)
        counts[source, group, parent] += 1
    weights = []
    for row in rows:
        source, group, parent = row["source"], row["group"], row["parent"]
        denominator = (
            len(groups)
            * len(groups[source])
            * len(parents[source, group])
            * counts[source, group, parent]
        )
        weights.append(1.0 / denominator)
    result = np.array(weights)
    np.testing.assert_allclose(result.sum(), 1.0)
    return result


def weighted_quantile(values, weights, quantile):
    values = np.asarray(values)
    order = np.argsort(values, kind="stable")
    cumulative = np.cumsum(weights[order])
    index = min(int(np.searchsorted(cumulative, quantile)), len(order) - 1)
    return float(values[order[index]])


def make_config(rows, weights, manifest_sha, short_side):
    means = [row["features"]["clean"]["mean_luminance"] for row in rows]
    highlights = [row["features"]["clean"]["highlight_fraction"] for row in rows]
    return {
        "version": "brightness-v1",
        "metric": "alpha_weighted_integer_rgb_luminance",
        "minimum_mean_luminance": weighted_quantile(means, weights, 0.005),
        "maximum_mean_luminance": weighted_quantile(means, weights, 0.995),
        "maximum_highlight_fraction": weighted_quantile(highlights, weights, 0.995),
        "highlight_luminance": HIGHLIGHT,
        "bright_rule": "mean_above_maximum_and_highlight_fraction_above_maximum",
        "preprocessing": {
            "input_size": INPUT_SIZE,
            "resize_short_side": short_side,
            "crop": "center; resized dimensions floor; offsets rounded half up",
            "reference_interpolation": "Pillow bicubic",
            "alpha": "weight pixels by alpha; fully transparent pixels contribute zero",
            "opaque_images": "all pixels have equal weight; no inferred leaf mask",
            "grayscale": "floor((19595R+38470G+7471B+32768)/65536)",
        },
        "selection": {
            "split": "train",
            "labels": "all supported labels; unsupported excluded",
            "quantiles": {
                "lower_mean": 0.005,
                "upper_mean": 0.995,
                "upper_clip": 0.995,
            },
            "weighting": "equal source, then equal group within source, then equal parent within group, then equal image within parent",
            "rule": "dark if mean below lower bound; bright only if BOTH mean and highlight fraction exceed upper bounds; equality passes",
            "validation_used_for_selection": False,
            "external_used_for_selection": False,
        },
        "provenance": {
            "manifest_sha256": manifest_sha,
            "calibration_script_sha256": digest(Path(__file__)),
            "training_images": len(rows),
            "training_sources": dict(
                sorted(Counter(r["source"] for r in rows).items())
            ),
            "training_groups": len({r["group"] for r in rows}),
            "all_training_image_hashes_verified": True,
        },
    }


def exposure_state(features, config):
    if features["mean_luminance"] < config["minimum_mean_luminance"]:
        return "too_dark"
    if (
        features["mean_luminance"] > config["maximum_mean_luminance"]
        and features["highlight_fraction"] > config["maximum_highlight_fraction"]
    ):
        return "too_bright"
    return "acceptable"


def summarize(rows, config):
    names = rows[0]["features"]
    result = {}
    for name in names:
        counts = Counter(exposure_state(r["features"][name], config) for r in rows)
        result[name] = {"n": len(rows), "states": dict(counts)}
    return result


def scan_rows():
    import csv

    metadata = ROOT / "data/scans/metadata.csv"
    if not metadata.exists():
        return []
    mapping = {"roya": "rust", "healthy": "healthy", "ojo": "unsupported"}
    with metadata.open(encoding="utf-8") as handle:
        return [
            {
                "path": str(Path("data/scans/images") / row["category"] / row["file"]),
                "source": "pg26038_scans",
                "parent": row["leaf_id"],
                "group": row["leaf_id"],
                "label": mapping[row["category"]],
            }
            for row in csv.DictReader(handle)
        ]


def synthetic_contract_checks(config):
    transparent = np.zeros((224, 224, 4), dtype=np.uint8)
    transparent[40:180, 90:120] = [90, 90, 90, 255]
    assert exposure_features(transparent)["mean_luminance"] == 90.0
    black = np.zeros((224, 224, 4), dtype=np.uint8)
    black[:, :, 3] = 255
    white = np.full((224, 224, 4), 255, dtype=np.uint8)
    assert exposure_state(exposure_features(black), config) == "too_dark"
    assert exposure_state(exposure_features(white), config) == "too_bright"
    return {
        "alpha_ignores_transparent_background": True,
        "black_dark": True,
        "white_bright": True,
    }


def evaluate_frozen(config, rows, short_side):
    validation = [
        r for r in rows if r["split"] == "val" and r["label"] != "unsupported"
    ]
    measured = measure_rows(validation, short_side, challenges=True)
    report = {
        "config_sha256_before_validation": digest(CONFIG),
        "validation": summarize(measured, config),
        "validation_by_source": {
            source: summarize([r for r in measured if r["source"] == source], config)
            for source in sorted({r["source"] for r in measured})
        },
        "synthetic_contract_checks": synthetic_contract_checks(config),
        "limitations": [
            "Brightness screening only; no model inference or diagnostic accuracy claim.",
            "Thresholds describe training exposure, not a biological or optical standard.",
            "Synthetic exposure challenges do not establish real camera performance.",
            "Opaque photos still include background; no leaf segmentation is inferred.",
            "Native device interpolation and JPEG encoding remain to be validated on a phone.",
            "Scans were previously inspected; this is development evidence, not a fresh test.",
        ],
    }
    scans = scan_rows()
    if scans:
        scan_measurements = measure_rows(scans, short_side)
        report["scan_brightness_only"] = summarize(scan_measurements, config)
        write_json(OUTPUT / "scan_features.json", scan_measurements)
    report["config_sha256_after_validation"] = digest(CONFIG)
    assert (
        report["config_sha256_before_validation"]
        == report["config_sha256_after_validation"]
    )
    write_json(OUTPUT / "validation_features.json", measured)
    return report


def main():
    rows = json.loads(MANIFEST.read_text(encoding="utf-8"))["images"]
    model_config = ROOT.parent / "mobile/assets/model/model-config.json"
    crop_pct = json.loads(model_config.read_text(encoding="utf-8"))["crop_pct"]
    short_side = int(INPUT_SIZE / crop_pct)
    train = [r for r in rows if r["split"] == "train" and r["label"] != "unsupported"]
    print(f"Measuring {len(train)} supported training images", flush=True)
    measured = measure_rows(train, short_side)
    weights = balanced_weights(measured)
    config = make_config(measured, weights, digest(MANIFEST), short_side)
    write_json(CONFIG, config)
    write_json(OUTPUT / "frozen_config.json", config)
    write_json(
        OUTPUT / "training_features.json",
        {"rows": measured, "weights": weights.tolist()},
    )
    print(json.dumps(config, indent=2), flush=True)
    report = evaluate_frozen(config, rows, short_side)
    report["training"] = summarize(measured, config)
    report["config_sha256"] = digest(CONFIG)
    write_json(OUTPUT / "evaluation.json", report)
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
