# ruff: noqa: E402
# Block networking before importing any inference libraries.
"""Fresh-process verification with outgoing socket connections blocked."""

import json
import socket

attempts = []


def deny_network(*args, **kwargs):
    attempts.append("blocked")
    raise RuntimeError("Networking blocked for offline inference verification")


socket.socket.connect = deny_network
socket.socket.connect_ex = deny_network
socket.create_connection = deny_network

import numpy as np
import torch
from ai_edge_litert.interpreter import Interpreter
from export_mobile import PhoneModel, raw_tensor
from final_evaluation import ARTIFACT, RUN, sha
from model_utils import initialize_runtime, load_model, read_records
from evaluate_additional import passes_quality

initialize_runtime()
row = next(r for r in read_records() if r["split"] == "test" and r["label"] == "rust")
config = json.loads((RUN / "calibration.json").read_text())
raw = raw_tensor(row["path"])
with torch.inference_mode():
    expected = PhoneModel(
        load_model(RUN / "best.safetensors").eval(), config["temperature"]
    )(torch.from_numpy(raw)).numpy()
lite = Interpreter(model_path=str(ARTIFACT), num_threads=4)
lite.allocate_tensors()
lite.set_tensor(lite.get_input_details()[0]["index"], raw)
lite.invoke()
actual = lite.get_tensor(lite.get_output_details()[0]["index"])
assert actual.shape == (1, 8) and np.isfinite(actual).all()
assert not attempts
report = dict(
    artifact_sha256=sha(ARTIFACT),
    fresh_process=True,
    outbound_sockets_blocked=True,
    attempted_connections=len(attempts),
    checkpoint_prediction=int(expected.argmax()),
    mobile_prediction=int(actual.argmax()),
    runtime_operations=sorted({op["op_name"] for op in lite._get_ops_details()}),
    input_dtype=str(lite.get_input_details()[0]["dtype"]),
    custom_ops_present=any(op["op_name"] == "CUSTOM" for op in lite._get_ops_details()),
    app_load="Bundled require(./assets/model/coffee-leaf.tflite); CPU delegate list []",
    phone_device_tested=False,
)
(RUN / "offline_verification.json").write_text(json.dumps(report, indent=2))
samples = [r for r in read_records() if r["split"] == "test"][::900]
fixtures = [
    dict(
        rgb=raw_tensor(r["path"])[0].reshape(-1).astype(int).tolist(),
        expected=passes_quality(raw_tensor(r["path"])[0], config["quality"]),
    )
    for r in samples
]
(RUN / "quality_fixtures.json").write_text(json.dumps(fixtures))
print(json.dumps(report, indent=2))
