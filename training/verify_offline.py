# Block networking before importing any inference libraries.
"""Verify the bundled leaf model in a fresh process with networking blocked.

The default path compares the bundled TFLite artifact with the exported
checkpoint. ``--artifact-only`` is a smaller path for machines that have the
mobile artifact and a photo but do not have the training checkpoint or its
manifest.
"""

import argparse
import hashlib
import json
import socket
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ARTIFACT = ROOT.parent / "mobile/assets/model/coffee-leaf.tflite"
MODEL_CONFIG = ARTIFACT.with_name("model-config.json")
RESULTS = ROOT / "results"
RUN = ROOT / "runs/efficientnet"

attempts = []


def deny_network(*args, **kwargs):
    attempts.append("blocked")
    raise RuntimeError("Networking blocked for offline inference verification")


def block_network():
    socket.socket.connect = deny_network
    socket.socket.connect_ex = deny_network
    socket.create_connection = deny_network


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--artifact-only",
        action="store_true",
        help="verify only the bundled TFLite model and one supplied photo",
    )
    parser.add_argument(
        "--photo",
        type=Path,
        help="photo to preprocess and classify with --artifact-only",
    )
    args = parser.parse_args()
    if args.artifact_only and args.photo is None:
        parser.error("--photo is required with --artifact-only")
    if args.photo is not None and not args.artifact_only:
        parser.error("--photo is only valid with --artifact-only")
    return args


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def evidence_signature(artifact_hash, config_hash, photo_hash):
    payload = json.dumps(
        {
            "artifact_sha256": artifact_hash,
            "model_config_sha256": config_hash,
            "photo_sha256": photo_hash,
        },
        sort_keys=True,
    ).encode()
    return hashlib.sha256(payload).hexdigest()


def load_config():
    config = json.loads(MODEL_CONFIG.read_text())
    artifact_hash = sha(ARTIFACT)
    configured_hash = config["calibration"]["artifact_sha256"]
    if configured_hash != artifact_hash:
        raise ValueError(
            "Model config artifact hash does not match the bundled TFLite file"
        )
    return config, sha(MODEL_CONFIG), artifact_hash


def load_interpreter(path):
    try:
        from ai_edge_litert.interpreter import Interpreter

        return Interpreter(model_path=str(path), num_threads=4), "ai_edge_litert"
    except ImportError:
        import tensorflow as tf

        return tf.lite.Interpreter(
            model_path=str(path), num_threads=4
        ), "tensorflow_lite"


def preprocess_photo(path, crop_pct):
    import numpy as np
    from PIL import Image

    image_size = 224
    short_side = int(image_size / crop_pct)
    with Image.open(path) as source:
        image = source.convert("RGB")
        scale = short_side / min(image.size)
        width = round(image.width * scale)
        height = round(image.height * scale)
        image = image.resize((width, height), Image.Resampling.BICUBIC)
        left = (width - image_size) // 2
        top = (height - image_size) // 2
        image = image.crop((left, top, left + image_size, top + image_size))
        return np.asarray(image, dtype=np.float32)[None]


def quality_features(rgb):
    import numpy as np

    weighted = 19595 * rgb[..., 0] + 38470 * rgb[..., 1] + 7471 * rgb[..., 2] + 32768
    gray = np.floor(weighted / 65536).astype(np.float32)
    laplacian = (
        4 * gray[1:-1, 1:-1]
        - gray[:-2, 1:-1]
        - gray[2:, 1:-1]
        - gray[1:-1, :-2]
        - gray[1:-1, 2:]
    )
    return float(laplacian.var()), float(gray.mean())


def tensor_dtype(value):
    import numpy as np

    return np.dtype(value).name


def operation_details(interpreter):
    details = interpreter._get_ops_details()
    names = [str(item["op_name"]) for item in details]
    return details, names


def storage_proof(interpreter, operation_info):
    import numpy as np

    tensor_details = interpreter.get_tensor_details()
    dtype_counts = {}
    for tensor in tensor_details:
        dtype = tensor_dtype(tensor["dtype"])
        dtype_counts[dtype] = dtype_counts.get(dtype, 0) + 1
    float16_ops = [
        item
        for item in operation_info
        if item["op_name"] == "DEQUANTIZE"
        and any(
            np.dtype(value) == np.dtype(np.float16) for value in item["operand_types"]
        )
    ]
    dequantize_count = sum(item["op_name"] == "DEQUANTIZE" for item in operation_info)
    float16_count = dtype_counts.get("float16", 0)
    return {
        "tensor_dtype_counts": dtype_counts,
        "float16_tensor_count": float16_count,
        "dequantize_op_count": int(dequantize_count),
        "dequantize_float16_input_count": len(float16_ops),
        "float16_storage_verified": bool(float16_count and float16_ops),
        "description": "Float16 tensors are dequantized to float32 inside the graph.",
    }


def photo_report_path(path):
    try:
        return str(path.resolve().relative_to(ROOT.parent))
    except ValueError:
        return path.name


def artifact_only(photo_path):
    import numpy as np

    photo = photo_path.expanduser().resolve()
    if not photo.is_file():
        raise FileNotFoundError(f"Photo does not exist: {photo}")
    config, config_hash, artifact_hash = load_config()
    raw = preprocess_photo(photo, config["crop_pct"])
    interpreter, runtime = load_interpreter(ARTIFACT)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]
    expected_shape = [1, 224, 224, 3]
    if input_details["shape"].tolist() != expected_shape:
        raise ValueError(f"Unexpected input shape: {input_details['shape'].tolist()}")
    if input_details["dtype"] != np.float32:
        raise ValueError(f"Unexpected input dtype: {input_details['dtype']}")
    if output_details["shape"].tolist() != [1, len(config["labels"])]:
        raise ValueError(f"Unexpected output shape: {output_details['shape'].tolist()}")
    interpreter.set_tensor(input_details["index"], raw)
    started = time.perf_counter()
    interpreter.invoke()
    inference_ms = (time.perf_counter() - started) * 1000
    probabilities = np.asarray(interpreter.get_tensor(output_details["index"])[0])
    operation_info, operation_names = operation_details(interpreter)
    probability_sum = float(probabilities.sum())
    softmax_ok = bool(
        probabilities.size == len(config["labels"])
        and np.isfinite(probabilities).all()
        and (probabilities >= 0).all()
        and (probabilities <= 1).all()
        and abs(probability_sum - 1) <= 1e-3
        and "SOFTMAX" in operation_names
    )
    if not softmax_ok:
        raise ValueError("Bundled output is not a finite normalized softmax")
    if attempts:
        raise RuntimeError(
            f"Offline verification attempted {len(attempts)} network calls"
        )
    edge_variance, mean_luminance = quality_features(raw[0])
    limits = config["calibration"]["quality"]
    photo_hash = sha(photo)
    signature_list = (
        interpreter.get_signature_list()
        if hasattr(interpreter, "get_signature_list")
        else {}
    )
    report = {
        "artifact_sha256": artifact_hash,
        "artifact_bytes": ARTIFACT.stat().st_size,
        "model_config_sha256": config_hash,
        "model_config": config,
        "photo": photo_report_path(photo),
        "photo_sha256": photo_hash,
        "evidence_signature_sha256": evidence_signature(
            artifact_hash, config_hash, photo_hash
        ),
        "fresh_process": True,
        "outbound_sockets_blocked": True,
        "attempted_connections": len(attempts),
        "runtime": runtime,
        "input_shape": input_details["shape"].tolist(),
        "input_dtype": tensor_dtype(input_details["dtype"]),
        "output_shape": output_details["shape"].tolist(),
        "output_dtype": tensor_dtype(output_details["dtype"]),
        "model_signatures": signature_list,
        "probabilities": probabilities.astype(float).tolist(),
        "predicted_index": int(probabilities.argmax()),
        "predicted_label": config["labels"][int(probabilities.argmax())],
        "probability_sum": probability_sum,
        "softmax_verified": softmax_ok,
        "runtime_operations": sorted(set(operation_names)),
        "internal_operation_count": len(operation_info),
        "custom_ops_present": "CUSTOM" in operation_names,
        "float16_storage": storage_proof(interpreter, operation_info),
        "quality": {
            "edge_variance": edge_variance,
            "mean_luminance": mean_luminance,
            "minimum_edge_variance": limits["minimum_edge_variance"],
            "minimum_mean_luminance": limits["minimum_mean_luminance"],
            "passed": edge_variance >= limits["minimum_edge_variance"]
            and mean_luminance >= limits["minimum_mean_luminance"],
        },
        "inference_ms": inference_ms,
        "app_load": "Bundled require(./assets/model/coffee-leaf.tflite); CPU delegate list []",
        "phone_device_tested": False,
    }
    RESULTS.mkdir(parents=True, exist_ok=True)
    (RESULTS / "offline-verification.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


def full_checkpoint_verification():
    import numpy as np
    import torch
    from ai_edge_litert.interpreter import Interpreter
    from evaluate_additional import passes_quality
    from export_mobile import PhoneModel, raw_tensor
    from final_evaluation import ARTIFACT as FINAL_ARTIFACT
    from final_evaluation import RUN as FINAL_RUN
    from final_evaluation import sha as final_sha
    from model_utils import initialize_runtime, load_model, read_records

    initialize_runtime()
    row = next(
        r for r in read_records() if r["split"] == "test" and r["label"] == "rust"
    )
    metadata, config_hash, artifact_hash = load_config()
    config = metadata["calibration"]
    raw = raw_tensor(row["path"])
    with torch.inference_mode():
        expected = PhoneModel(
            load_model(FINAL_RUN / "best.safetensors").eval(), config["temperature"]
        )(torch.from_numpy(raw)).numpy()
    lite = Interpreter(model_path=str(FINAL_ARTIFACT), num_threads=4)
    lite.allocate_tensors()
    lite.set_tensor(lite.get_input_details()[0]["index"], raw)
    lite.invoke()
    actual = lite.get_tensor(lite.get_output_details()[0]["index"])
    assert actual.shape == (1, 8) and np.isfinite(actual).all()
    np.testing.assert_allclose(actual.sum(1), 1, atol=1e-4)
    np.testing.assert_allclose(actual, expected, rtol=0, atol=0.025)
    assert actual.argmax() == expected.argmax()
    assert not attempts
    report = {
        "artifact_sha256": artifact_hash,
        "model_config_sha256": config_hash,
        "checkpoint_sha256": final_sha(FINAL_RUN / "best.safetensors"),
        "fresh_process": True,
        "outbound_sockets_blocked": True,
        "attempted_connections": len(attempts),
        "checkpoint_prediction": int(expected.argmax()),
        "mobile_prediction": int(actual.argmax()),
        "maximum_probability_error": float(np.max(np.abs(actual - expected))),
        "argmax_disagreements": 0,
        "runtime_operations": sorted({op["op_name"] for op in lite._get_ops_details()}),
        "input_dtype": str(lite.get_input_details()[0]["dtype"]),
        "custom_ops_present": any(
            op["op_name"] == "CUSTOM" for op in lite._get_ops_details()
        ),
        "app_load": "Bundled require(./assets/model/coffee-leaf.tflite); CPU delegate list []",
        "phone_device_tested": False,
    }
    FINAL_RUN.mkdir(parents=True, exist_ok=True)
    (FINAL_RUN / "offline_verification.json").write_text(json.dumps(report, indent=2))
    samples = [r for r in read_records() if r["split"] == "test"][::900]
    fixtures = [
        {
            "rgb": raw_tensor(r["path"])[0].reshape(-1).astype(int).tolist(),
            "expected": passes_quality(raw_tensor(r["path"])[0], config["quality"]),
        }
        for r in samples
    ]
    (FINAL_RUN / "quality_fixtures.json").write_text(json.dumps(fixtures))
    print(json.dumps(report, indent=2))


def main():
    block_network()
    args = parse_args()
    if args.artifact_only:
        artifact_only(args.photo)
        return
    full_checkpoint_verification()


if __name__ == "__main__":
    main()
