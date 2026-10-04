"""Export the selected B1 with validation-checked compressed weights and app gates."""

import copy
import importlib.util
import json
import shutil

import flatbuffers
import numpy as np
import onnx
import torch
from scipy.optimize import minimize_scalar

from b1_model import MANIFEST, REPOSITORY, REVISION, load_model
from compare_model_runtime import (
    BRIGHTNESS,
    ROOT,
    LABELS,
    class_thresholds,
    image_input,
    interpreter_for,
    manifest_records,
    raw_metrics,
    read_json,
    runtime_predict,
    sha,
    write_json,
)
from export_mobile import PhoneModel

RUN = ROOT / "runs/efficientnet_b1"
ASSETS = ROOT.parent / "mobile/assets/model"


def fit_temperature(logits, labels):
    logits = torch.as_tensor(logits)
    labels = torch.as_tensor(labels, dtype=torch.long)

    def loss(temperature):
        return float(torch.nn.functional.cross_entropy(logits / temperature, labels))

    return float(minimize_scalar(loss, bounds=(0.25, 5), method="bounded").x)


def float32_export(temperature):
    from onnx2tf import convert

    model = load_model(RUN / "best.safetensors").eval()
    wrapper = PhoneModel(model, temperature).eval()
    path = RUN / "phone.onnx"
    torch.onnx.export(
        wrapper,
        torch.zeros(1, 224, 224, 3),
        str(path),
        input_names=["rgb"],
        output_names=["probabilities"],
        opset_version=18,
        dynamo=False,
    )
    onnx.checker.check_model(str(path))
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
    paths = list(folder.glob("*float32.tflite"))
    if len(paths) != 1:
        raise ValueError(f"Expected one float32 model: {paths}")
    return paths[0], model


def load_schema(folder):
    spec = importlib.util.spec_from_file_location(
        "b1_tflite_schema", folder / "schema_generated.py"
    )
    schema = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(schema)
    return schema


def weight_axes(model, graph, schema, preserve_head):
    axes = {
        schema.BuiltinOperator.CONV_2D: 0,
        schema.BuiltinOperator.DEPTHWISE_CONV_2D: 3,
    }
    result = {}
    for op in graph.operators:
        code = model.operatorCodes[op.opcodeIndex].builtinCode
        if code not in axes:
            continue
        index = int(op.inputs[1])
        name = (graph.tensors[index].name or b"").decode(errors="replace")
        if preserve_head and "conv_head" in name:
            continue
        result[index] = axes[code]
    return result


def quantized_weight(model, tensor, axis, schema):
    buffer = model.buffers[tensor.buffer]
    raw = np.asarray(buffer.data, dtype=np.uint8).tobytes()
    weights = np.frombuffer(raw, dtype="<f4").reshape(tensor.shape)
    if not np.isfinite(weights).all():
        raise ValueError("Non-finite model weights")
    reduction = tuple(i for i in range(weights.ndim) if i != axis)
    scales = np.max(np.abs(weights), axis=reduction) / 127
    scales = np.where(scales > 0, scales, 1).astype(np.float32)
    shape = [1] * weights.ndim
    shape[axis] = len(scales)
    quantized = np.rint(weights / scales.reshape(shape)).clip(-127, 127).astype(np.int8)
    new_buffer = schema.BufferT()
    new_buffer.data = np.frombuffer(quantized.tobytes(), dtype=np.uint8)
    tensor.buffer = len(model.buffers)
    model.buffers.append(new_buffer)
    tensor.type = schema.TensorType.INT8
    tensor.quantization = schema.QuantizationParametersT()
    tensor.quantization.scale = scales
    tensor.quantization.zeroPoint = np.zeros(len(scales), dtype=np.int64)
    tensor.quantization.quantizedDimension = axis


def compress_graph(model, graph, schema, opcode_index, preserve_head):
    replacements, operations = {}, []
    axes = weight_axes(model, graph, schema, preserve_head)
    for index, axis in axes.items():
        tensor = graph.tensors[index]
        output = copy.deepcopy(tensor)
        output.buffer, output.quantization = 0, None
        output.name = tensor.name + b"_decompressed"
        replacements[index] = len(graph.tensors)
        graph.tensors.append(output)
        quantized_weight(model, tensor, axis, schema)
        operation = schema.OperatorT()
        operation.opcodeIndex = opcode_index
        operation.inputs = np.array([index], dtype=np.int32)
        operation.outputs = np.array([replacements[index]], dtype=np.int32)
        operations.append(operation)
    for operation in graph.operators:
        operation.inputs = np.array(
            [replacements.get(int(i), int(i)) for i in operation.inputs], dtype=np.int32
        )
    graph.operators = operations + graph.operators
    return len(axes)


def compress_weights(source, preserve_head=False, output_folder=None):
    schema = load_schema(source.parent)
    model = schema.ModelT.InitFromPackedBuf(source.read_bytes())
    opcode = schema.OperatorCodeT()
    opcode.builtinCode = opcode.deprecatedBuiltinCode = (
        schema.BuiltinOperator.DEQUANTIZE
    )
    opcode.version = 5
    model.operatorCodes.append(opcode)
    count = sum(
        compress_graph(
            model, graph, schema, len(model.operatorCodes) - 1, preserve_head
        )
        for graph in model.subgraphs
    )
    used_buffers = {
        tensor.buffer for graph in model.subgraphs for tensor in graph.tensors
    }
    for index, buffer in enumerate(model.buffers):
        if index not in used_buffers:
            buffer.data = None
    builder = flatbuffers.Builder(0)
    builder.Finish(model.Pack(builder), file_identifier=b"TFL3")
    variant = "head_fp32" if preserve_head else "int8_weights"
    path = (output_folder or source.parent) / f"phone_{variant}.tflite"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(bytes(builder.Output()))
    assert path.stat().st_size < 10_000_000
    return path, dict(
        variant=variant, quantized_weight_tensors=count, bytes=path.stat().st_size
    )


def compression_metrics(expected, actual, truth):
    reference = raw_metrics(expected, truth)
    runtime = raw_metrics(actual, truth)
    accuracy_drop = reference["accuracy"] - runtime["accuracy"]
    f1_drop = reference["macro_f1"] - runtime["macro_f1"]
    return dict(
        n=len(truth),
        maximum_probability_error=float(np.abs(expected - actual).max()),
        mean_absolute_probability_error=float(np.abs(expected - actual).mean()),
        top1_disagreements=int((expected.argmax(1) != actual.argmax(1)).sum()),
        accuracy_drop=accuracy_drop,
        macro_f1_drop=f1_drop,
        eligible=accuracy_drop <= 0.01 and f1_drop <= 0.01,
        policy="Validation only: <=1 percentage point accuracy and macro F1 loss relative to selected checkpoint",
    )


def verify_float_graph(source, expected, truth, rows):
    interpreter, inp, out = interpreter_for(source)
    indices = np.concatenate(
        [np.flatnonzero(truth == label)[:8] for label in range(len(LABELS))]
    )
    errors, changed = [], []
    for index in indices:
        interpreter.set_tensor(inp, image_input(rows[int(index)], "canonical"))
        interpreter.invoke()
        actual = interpreter.get_tensor(out)[0]
        np.testing.assert_allclose(actual, expected[index], rtol=1e-4, atol=1e-4)
        errors.append(float(np.abs(actual - expected[index]).max()))
        changed.append(bool(actual.argmax() != expected[index].argmax()))
    write_json(
        RUN / "float32_conversion_parity.json",
        dict(
            validation_samples=len(indices),
            maximum_probability_error=max(errors),
            top1_disagreements=sum(changed),
            atol=1e-4,
            rtol=1e-4,
            checkpoint_sha256=sha(RUN / "best.safetensors"),
            float32_artifact_sha256=sha(source),
        ),
    )


def select_compression(source, expected, truth, rows):
    candidates = []
    for preserve_head in [False, True]:
        artifact, metadata = compress_weights(source, preserve_head)
        data = runtime_predict(artifact, rows, f"b1_validation_{metadata['variant']}")
        parity = compression_metrics(expected, data["probabilities"], truth)
        candidates.append(dict(**metadata, parity=parity))
        write_json(RUN / "compression_validation.json", candidates)
        if parity["eligible"]:
            return artifact, data, candidates
    raise RuntimeError(
        "Neither compressed B1 meets the predeclared validation fidelity bounds"
    )


def publish(artifact, calibration, model, candidates, temperature):
    calibration.update(
        runtime="LiteRT CPU int8 per-channel weight storage / float32 computation",
        artifact_sha256=sha(artifact),
        brightness_config_sha256=sha(BRIGHTNESS),
        version="b1-deployed-v1",
        temperature=temperature,
        selection="Validation-only compressed runtime, current shared brightness policy; >=15 accepted and >=90%/95% precision per class",
    )
    calibration.pop("accept_threshold", None)
    write_json(RUN / "calibration.json", calibration)
    destination = ASSETS / "coffee-leaf-b1.tflite"
    shutil.copyfile(artifact, destination)
    config = dict(
        labels=LABELS,
        app_condition_keys=[
            "cercospora",
            "healthy",
            "miner",
            "phoma",
            "rust",
            "mites",
            "weevil",
        ],
        calibration=calibration,
        input="float32 raw RGB 0..255 NHWC",
        crop_pct=0.875,
        architecture="efficientnet_b1",
        input_size=224,
        model_repository=REPOSITORY,
        model_revision=REVISION,
        manifest_sha256=sha(MANIFEST),
        checkpoint_sha256=sha(RUN / "best.safetensors"),
        calibration_sha256=sha(RUN / "calibration.json"),
    )
    write_json(ASSETS / "model-config-b1.json", config)
    report = dict(
        artifact_sha256=sha(destination),
        checkpoint_sha256=sha(RUN / "best.safetensors"),
        parameter_count=sum(p.numel() for p in model.parameters()),
        bytes=destination.stat().st_size,
        compression_candidates=candidates,
        test_or_external_used_for_selection=False,
        phone_device_tested=False,
    )
    write_json(RUN / "export_validation.json", report)
    print(json.dumps(report, indent=2), flush=True)


def main():
    torch.set_num_threads(8)
    torch.set_num_interop_threads(1)
    rows = [r for r in manifest_records() if r["split"] == "val"]
    stored = np.load(RUN / "selected_validation.npz")
    truth = np.array([LABELS.index(row["label"]) for row in rows])
    np.testing.assert_array_equal(stored["labels"], truth)
    np.testing.assert_array_equal(stored["paths"], [row["path"] for row in rows])
    temperature = fit_temperature(stored["logits"], truth)
    expected = torch.softmax(torch.as_tensor(stored["logits"]) / temperature, 1).numpy()
    source, model = float32_export(temperature)
    verify_float_graph(source, expected, truth, rows)
    artifact, data, candidates = select_compression(source, expected, truth, rows)
    calibration = dict(
        quality=copy.deepcopy(
            read_json(ASSETS / "model-config.json")["calibration"]["quality"]
        ),
        validation_n=len(rows),
    )
    calibration.update(
        class_thresholds(data["probabilities"], data["quality"], truth, calibration)
    )
    publish(artifact, calibration, model, candidates, temperature)


if __name__ == "__main__":
    main()
