import json
import numpy as np
from PIL import Image, ImageFilter
from model_utils import ROOT, initialize_runtime, load_model, read_records, LABELS
from finetune import predict
from export_mobile import raw_tensor
from evaluate_additional import quality_features


def main():
    initialize_runtime()
    records = read_records()
    validation = [r for r in records if r["split"] == "val"]
    run = ROOT / "runs/efficientnet"
    config = json.loads((run / "calibration.json").read_text())
    logits, y = predict(load_model(run / "best.safetensors").eval(), validation)
    probabilities = (logits / config["temperature"]).softmax(1).numpy()
    predicted = probabilities.argmax(1)
    thresholds = []
    confident = []
    evidence = []
    for label in range(7):
        possibilities = []
        high = []
        for threshold in np.linspace(0.4, 0.995, 120):
            accepted = (predicted == label) & (probabilities[:, label] >= threshold)
            n = int(accepted.sum())
            precision = float((y.numpy()[accepted] == label).mean()) if n else 0
            if n >= 15 and precision >= 0.90:
                possibilities.append(float(threshold))
            if n >= 15 and precision >= 0.95:
                high.append(float(threshold))
        chosen = min(possibilities) if possibilities else 1.01
        thresholds.append(chosen)
        confident.append(min(high) if high else 1.01)
        evidence.append(
            {
                "label": LABELS[label],
                "accept_threshold": chosen,
                "enabled": bool(possibilities),
                "val_true_support": int((y.numpy() == label).sum()),
            }
        )
    clean = [r for r in validation if r["label"] != "unsupported"][::5]
    features = []
    blur = []
    for row in clean:
        rgb = raw_tensor(row["path"])[0]
        features.append(quality_features(rgb))
        transformed = np.array(
            Image.fromarray(rgb.astype("uint8")).filter(ImageFilter.GaussianBlur(10))
        )
        blur.append(quality_features(transformed))
    features = np.array(features)
    blur = np.array(blur)
    minimum_light = float(np.quantile(features[:, 1], 0.01))
    candidates = []
    for percentile in np.linspace(0.01, 0.1, 30):
        edge = float(np.quantile(features[:, 0], percentile))
        positive = (features[:, 0] >= edge) & (features[:, 1] >= minimum_light)
        negative = (blur[:, 0] >= edge) & (blur[:, 1] >= minimum_light)
        if positive.mean() >= 0.90:
            candidates.append(
                (float(0.5 * (positive.mean() + 1 - negative.mean())), edge)
            )
    _, edge = max(candidates)
    config.update(
        class_thresholds=thresholds,
        confident_thresholds=confident,
        class_threshold_evidence=evidence,
        quality={
            "minimum_edge_variance": edge,
            "minimum_mean_luminance": minimum_light,
            "selection": "validation-only severe Gaussianblur challenge balancedaccuracy subject to >=90% clear acceptance",
        },
    )
    (run / "calibration.json").write_text(json.dumps(config, indent=2))
    print(json.dumps(config, indent=2), flush=True)


if __name__ == "__main__":
    main()
