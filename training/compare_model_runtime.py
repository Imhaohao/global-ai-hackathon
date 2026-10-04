"""Shared fixed preprocessing, current app gates and cached CPU model evaluation."""

import hashlib
import importlib.metadata
import json
import time
from pathlib import Path

import numpy as np
from PIL import Image
from ai_edge_litert.interpreter import Interpreter
from sklearn.metrics import classification_report, confusion_matrix, f1_score

from calibrate_brightness import crop_rgba, exposure_features, exposure_state
from evaluate_additional import quality_features
from export_mobile import raw_tensor
from model_utils import ROOT, LABELS

RUN = ROOT / "runs/model_comparison"
BRIGHTNESS = ROOT.parent / "mobile/assets/model/brightness-config.json"


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def manifest_records(name="scale_v3_manifest.json"):
    return read_json(ROOT / "data" / name)["images"]


def cache_signature(artifact, records, variant, threads):
    digest = hashlib.sha256()
    for path in [
        artifact,
        BRIGHTNESS,
        Path(__file__),
        ROOT / "export_mobile.py",
        ROOT / "calibrate_brightness.py",
        ROOT / "evaluate_additional.py",
        ROOT / "models/huyt/config.json",
        ROOT.parent / "mobile/src/diagnosis/imageQuality.ts",
    ]:
        digest.update(bytes.fromhex(sha(path)))
    digest.update(json.dumps(records, sort_keys=True).encode())
    digest.update(variant.encode())
    versions = {
        name: importlib.metadata.version(name)
        for name in ["ai-edge-litert", "numpy", "pillow", "torch", "torchvision"]
    }
    digest.update(
        json.dumps(dict(versions=versions, threads=threads), sort_keys=True).encode()
    )
    for row in records:
        actual = sha(ROOT / row["path"])
        if row.get("sha256") and row["sha256"] != actual:
            raise ValueError(f"Changed image: {row['path']}")
        digest.update(bytes.fromhex(actual))
    return digest.hexdigest()


def image_input(row, variant):
    raw = raw_tensor(row["path"])
    if variant == "far_65_percent":
        image = Image.fromarray(raw[0].astype(np.uint8))
        reduced = image.resize((146, 146), Image.Resampling.BICUBIC)
        background = tuple(np.median(raw[0].reshape(-1, 3), axis=0).astype(int))
        canvas = Image.new("RGB", (224, 224), background)
        canvas.paste(reduced, (39, 39))
        raw = np.array(canvas, dtype=np.float32)[None]
    elif variant != "canonical":
        raise ValueError(f"Unknown input variant {variant}")
    return raw


def current_quality(row, raw, brightness, variant):
    edge, old_light = quality_features(raw[0])
    if variant == "canonical":
        with Image.open(ROOT / row["path"]) as image:
            exposure = exposure_features(crop_rgba(image, 256))
    else:
        rgba = np.concatenate([raw[0], np.full((224, 224, 1), 255)], axis=2)
        exposure = exposure_features(rgba.astype(np.uint8))
    exposure_ok = exposure_state(exposure, brightness) == "acceptable"
    return [
        edge,
        old_light,
        exposure["mean_luminance"],
        exposure["highlight_fraction"],
        float(exposure_ok),
    ]


def interpreter_for(artifact, threads=4):
    interpreter = Interpreter(model_path=str(artifact), num_threads=threads)
    interpreter.allocate_tensors()
    inp, out = interpreter.get_input_details()[0], interpreter.get_output_details()[0]
    assert inp["shape"].tolist() == [1, 224, 224, 3] and inp["dtype"] == np.float32
    assert out["shape"].tolist() == [1, len(LABELS)] and out["dtype"] == np.float32
    return interpreter, inp["index"], out["index"]


def runtime_predict(artifact, records, name, variant="canonical", threads=4):
    RUN.mkdir(parents=True, exist_ok=True)
    signature = cache_signature(artifact, records, variant, threads)
    cache = RUN / f"{name}_{variant}.npz"
    if cache.exists():
        with np.load(cache) as data:
            if str(data["signature"]) == signature:
                return {
                    key: data[key] for key in ["probabilities", "quality", "latencies"]
                }
    interpreter, inp, out = interpreter_for(artifact, threads)
    brightness = read_json(BRIGHTNESS)
    probabilities, quality, latencies = [], [], []
    for index, row in enumerate(records):
        raw = image_input(row, variant)
        quality.append(current_quality(row, raw, brightness, variant))
        interpreter.set_tensor(inp, raw)
        start = time.perf_counter()
        interpreter.invoke()
        latencies.append((time.perf_counter() - start) * 1000)
        probabilities.append(interpreter.get_tensor(out)[0])
        if index % 500 == 0:
            print(name, variant, index, "/", len(records), flush=True)
    result = dict(
        probabilities=np.array(probabilities),
        quality=np.array(quality),
        latencies=np.array(latencies),
    )
    assert np.isfinite(result["probabilities"]).all()
    np.testing.assert_allclose(result["probabilities"].sum(1), 1, atol=1e-4)
    np.savez(cache, **result, signature=signature)
    return result


def clear_images(quality, calibration, legacy=False):
    blur_ok = quality[:, 0] >= calibration["quality"]["minimum_edge_variance"]
    exposure_ok = (
        quality[:, 1] >= calibration["quality"]["minimum_mean_luminance"]
        if legacy
        else quality[:, 4].astype(bool)
    )
    return blur_ok & exposure_ok


def decisions(probabilities, quality, calibration, legacy=False):
    predicted = probabilities.argmax(1)
    scores = probabilities.max(1)
    accept = np.array(calibration["class_thresholds"] + [1.01])
    confident = np.array(calibration["confident_thresholds"] + [1.01])
    accepted = (
        (scores >= accept[predicted])
        & clear_images(quality, calibration, legacy)
        & (predicted < 7)
    )
    states = np.where(
        accepted,
        np.where(scores >= confident[predicted], "confident", "possible"),
        "unclear",
    )
    return predicted, accepted, states


def raw_metrics(probabilities, truth, labels=None):
    chosen = probabilities.argmax(1)
    labels = list(range(len(LABELS))) if labels is None else labels
    return dict(
        n=len(truth),
        accuracy=float((chosen == truth).mean()),
        macro_f1=float(
            f1_score(truth, chosen, labels=labels, average="macro", zero_division=0)
        ),
        classification=classification_report(
            truth,
            chosen,
            labels=labels,
            target_names=[LABELS[i] for i in labels],
            output_dict=True,
            zero_division=0,
        ),
        confusion_matrix=confusion_matrix(
            truth, chosen, labels=list(range(len(LABELS)))
        ).tolist(),
    )


def gate_metrics(probabilities, quality, truth, calibration, legacy=False):
    chosen, accepted, states = decisions(probabilities, quality, calibration, legacy)
    unsupported = truth == 7
    correct = chosen == truth
    return dict(
        n=len(truth),
        accepted_n=int(accepted.sum()),
        accepted_coverage=float(accepted.mean()),
        accepted_accuracy=float(correct[accepted].mean()) if accepted.any() else None,
        correct_accepted_fraction=float((correct & accepted).mean()),
        confident_n=int((states == "confident").sum()),
        unsupported_n=int(unsupported.sum()),
        unsupported_false_accepts=int((unsupported & accepted).sum()),
        unsupported_reject_rate=float((~accepted[unsupported]).mean())
        if unsupported.any()
        else None,
    )


def summary(data, rows, calibration, labels=None):
    truth = np.array([LABELS.index(row["label"]) for row in rows])
    return dict(
        raw=raw_metrics(data["probabilities"], truth, labels),
        app=gate_metrics(data["probabilities"], data["quality"], truth, calibration),
    )


def subset(data, indices):
    return {key: values[indices] for key, values in data.items()}


def class_thresholds(probabilities, quality, truth, calibration):
    predicted = probabilities.argmax(1)
    clear = clear_images(quality, calibration)
    thresholds, confident, evidence = [], [], []
    for label in range(7):
        options = {0.90: [], 0.95: []}
        for threshold in np.linspace(0.4, 0.995, 120):
            accepted = (
                (predicted == label) & (probabilities[:, label] >= threshold) & clear
            )
            if accepted.sum() < 15:
                continue
            precision = float((truth[accepted] == label).mean())
            for target in options:
                if precision >= target:
                    options[target].append(float(threshold))
        threshold = min(options[0.90], default=1.01)
        thresholds.append(threshold)
        confident.append(min(options[0.95], default=1.01))
        evidence.append(
            dict(
                label=LABELS[label],
                enabled=threshold <= 1,
                accept_threshold=threshold,
                val_true_support=int((truth == label).sum()),
            )
        )
    return dict(
        class_thresholds=thresholds,
        confident_thresholds=confident,
        class_threshold_evidence=evidence,
    )
