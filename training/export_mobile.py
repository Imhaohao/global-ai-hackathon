import argparse
import json
import importlib.util
import copy
import flatbuffers
import shutil
import time

import numpy as np
import onnx
import onnxruntime as ort
import torch
from ai_edge_litert.interpreter import Interpreter
from PIL import Image
from torchvision import transforms

from model_utils import (
    ROOT,
    LABELS,
    initialize_runtime,
    load_model,
    read_records,
)

RUN = ROOT / "runs/efficientnet"


class PhoneModel(torch.nn.Module):
    def __init__(self, model, temperature):
        super().__init__()
        self.model = model
        self.temperature = temperature
        config = json.loads((ROOT / "models/huyt/config.json").read_text())[
            "pretrained_cfg"
        ]
        self.register_buffer("mean", torch.tensor(config["mean"]).reshape(1, 1, 1, 3))
        self.register_buffer("std", torch.tensor(config["std"]).reshape(1, 1, 1, 3))

    def forward(self, rgb):
        normalized = (rgb / 255.0 - self.mean) / self.std
        return (self.model(normalized.permute(0, 3, 1, 2)) / self.temperature).softmax(
            1
        )


def export_onnx(checkpoint, calibration):
    wrapper = PhoneModel(
        load_model(checkpoint).eval(), calibration["temperature"]
    ).eval()
    example = torch.zeros(1, 224, 224, 3)
    path = RUN / "phone.onnx"
    torch.onnx.export(
        wrapper,
        example,
        str(path),
        input_names=["rgb"],
        output_names=["probabilities"],
        opset_version=18,
        dynamo=False,
    )
    onnx.checker.check_model(str(path))
    return wrapper, path


def convert_tflite(path):
    from onnx2tf import convert

    folder = RUN / "tflite"
    convert(
        input_onnx_file_path=str(path),
        output_folder_path=str(folder),
        tflite_backend="flatbuffer_direct",
        batch_size=1,
        keep_shape_absolutely_input_names=["rgb"],
        not_use_onnxsim=True,
        report_op_coverage=True,
        non_verbose=True,
    )
    candidates = list(folder.glob("*float32.tflite"))
    if len(candidates) != 1:
        raise ValueError(f"Expected one float32 artifact: {candidates}")
    return float16_storage(candidates[0], folder)


def float16_storage(source, folder):
    spec = importlib.util.spec_from_file_location(
        "tflite_schema", folder / "schema_generated.py"
    )
    schema = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(schema)
    model = schema.ModelT.InitFromPackedBuf(source.read_bytes())
    opcode = schema.OperatorCodeT()
    opcode.builtinCode = schema.BuiltinOperator.DEQUANTIZE
    opcode.deprecatedBuiltinCode = schema.BuiltinOperator.DEQUANTIZE
    opcode.version = 1
    dequant_index = len(model.operatorCodes)
    model.operatorCodes.append(opcode)
    for graph in model.subgraphs:
        replacements, operations = {}, []
        for index, tensor in enumerate(list(graph.tensors)):
            buffer = model.buffers[tensor.buffer]
            if (
                tensor.type != schema.TensorType.FLOAT32
                or buffer.data is None
                or not len(buffer.data)
            ):
                continue
            original = np.asarray(buffer.data, dtype=np.uint8).tobytes()
            buffer.data = np.frombuffer(
                np.frombuffer(original, dtype="<f4").astype("<f2").tobytes(),
                dtype=np.uint8,
            )
            output_tensor = copy.deepcopy(tensor)
            output_tensor.buffer = 0
            output_tensor.name = tensor.name + b"_dequantized"
            replacements[index] = len(graph.tensors)
            graph.tensors.append(output_tensor)
            tensor.type = schema.TensorType.FLOAT16
            operation = schema.OperatorT()
            operation.opcodeIndex = dequant_index
            operation.inputs = np.array([index], dtype=np.int32)
            operation.outputs = np.array([replacements[index]], dtype=np.int32)
            operations.append(operation)
        for operation in graph.operators:
            operation.inputs = np.array(
                [replacements.get(int(i), int(i)) for i in operation.inputs],
                dtype=np.int32,
            )
        graph.operators = operations + graph.operators
    builder = flatbuffers.Builder(0)
    packed = model.Pack(builder)
    builder.Finish(packed, file_identifier=b"TFL3")
    output = folder / "phone_storage_float16.tflite"
    output.write_bytes(bytes(builder.Output()))
    return output


def raw_tensor(path):
    cfg = json.loads((ROOT / "models/huyt/config.json").read_text())["pretrained_cfg"]
    transform = transforms.Compose(
        [
            transforms.Resize(
                int(224 / cfg["crop_pct"]),
                interpolation=transforms.InterpolationMode.BICUBIC,
            ),
            transforms.CenterCrop(224),
        ]
    )
    with Image.open(ROOT / path) as image:
        return np.asarray(transform(image.convert("RGB")), dtype=np.float32)[None]


def verify(wrapper, onnx_path, tflite_path):
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    interpreter = Interpreter(model_path=str(tflite_path), num_threads=4)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]
    if (
        input_details["shape"].tolist() != [1, 224, 224, 3]
        or input_details["dtype"] != np.float32
    ):
        raise ValueError(f"Wrong phone input contract: {input_details}")
    records = read_records()
    samples = []
    for label in LABELS:
        samples += [r for r in records if r["split"] == "test" and r["label"] == label][
            :5
        ]
    errors, disagreements, latencies = [], [], []
    with torch.inference_mode():
        for row in samples:
            raw = raw_tensor(row["path"])
            expected = wrapper(torch.from_numpy(raw)).numpy()
            onnx_probs = session.run(None, {"rgb": raw})[0]
            np.testing.assert_allclose(onnx_probs, expected, rtol=1e-4, atol=1e-5)
            interpreter.set_tensor(input_details["index"], raw)
            started = time.perf_counter()
            interpreter.invoke()
            latencies.append((time.perf_counter() - started) * 1000)
            actual = interpreter.get_tensor(output_details["index"])
            assert np.isfinite(actual).all()
            np.testing.assert_allclose(actual.sum(1), 1, atol=1e-4)
            errors.append(float(np.max(np.abs(actual - expected))))
            disagreements.append(bool(actual.argmax() != expected.argmax()))
    if max(errors) > 0.025 or any(disagreements):
        raise ValueError(
            f"Export parity failure errors={max(errors)} disagreements={sum(disagreements)}"
        )
    return {
        "samples": len(samples),
        "maximum_probability_error": max(errors),
        "argmax_disagreements": sum(disagreements),
        "tflite_bytes": tflite_path.stat().st_size,
        "desktop_cpu_latency_median_ms": float(np.median(latencies[3:])),
        "desktop_cpu_threads": 4,
        "phone_benchmarked": False,
        "input_shape": input_details["shape"].tolist(),
        "output_shape": output_details["shape"].tolist(),
        "input_type": "float32 raw RGB 0..255 NHWC",
        "weight_storage": "float16",
        "preprocessing": "shortest-side256 andcenter224 bicubic before rawRGB; normalization andcalibrated softmax inside graph",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", default=str(RUN / "best.safetensors"))
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    initialize_runtime()
    calibration = (
        json.loads((RUN / "calibration.json").read_text())
        if (RUN / "calibration.json").exists()
        else {"temperature": 1.0, "accept_threshold": 1.0}
    )
    wrapper, onnx_path = export_onnx(args.checkpoint, calibration)
    artifact = convert_tflite(onnx_path)
    report = verify(wrapper, onnx_path, artifact)
    (RUN / "export_validation.json").write_text(json.dumps(report, indent=2))
    if args.publish:
        destination = ROOT.parent / "mobile/assets/model"
        destination.mkdir(parents=True, exist_ok=True)
        shutil.copy2(artifact, destination / "coffee-leaf.tflite")
        metadata = {
            "labels": LABELS,
            "app_condition_keys": [
                "cercospora",
                "healthy",
                "miner",
                "phoma",
                "rust",
                "mites",
                "weevil",
            ],
            "calibration": calibration,
            "input": report["input_type"],
            "crop_pct": 0.875,
            "model_revision": "252d26841543befab22880876f8ca91543230aab",
        }
        (destination / "model-config.json").write_text(json.dumps(metadata, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
