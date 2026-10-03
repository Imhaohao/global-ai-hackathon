import argparse
import json
import torch
from PIL import Image
from evaluate_additional import passes_quality
from export_mobile import raw_tensor
from model_utils import ROOT, LABELS, image_transform, initialize_runtime, load_model


def main():
    parser = argparse.ArgumentParser(
        description="Offline coffee symptom inference on a close-up RGB crop."
    )
    parser.add_argument("image")
    parser.add_argument(
        "--checkpoint", default=str(ROOT / "runs/efficientnet/best.safetensors")
    )
    args = parser.parse_args()
    initialize_runtime()
    calibration = json.loads((ROOT / "runs/efficientnet/calibration.json").read_text())
    model = load_model(args.checkpoint).eval()
    with Image.open(args.image) as image:
        tensor = image_transform()(image.convert("RGB")).unsqueeze(0)
    raw = raw_tensor(args.image)[0]
    with torch.inference_mode():
        probabilities = (model(tensor) / calibration["temperature"]).softmax(1)[0]
    index = int(probabilities.argmax())
    accepted = (
        index < 7
        and float(probabilities[index]) >= calibration["class_thresholds"][index]
        and passes_quality(raw, calibration["quality"])
    )
    print(
        json.dumps(
            {
                "prediction": LABELS[index] if accepted else "unclear_or_unsupported",
                "probabilities": dict(zip(LABELS, probabilities.tolist())),
                "accepted": accepted,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
