"""Run B3's local artifact in a new process with outbound sockets blocked."""

import json
import socket

ATTEMPTS = []


def blocked(*args, **kwargs):
    ATTEMPTS.append("outbound_socket")
    raise RuntimeError("Outbound sockets disabled during B3 verification")


socket.socket.connect = blocked
socket.socket.connect_ex = blocked
socket.create_connection = blocked

from b3_model import HOME, RUN  # noqa: E402
import numpy as np  # noqa: E402
from compare_model_runtime import (  # noqa: E402
    image_input,
    interpreter_for,
    manifest_records,
    read_json,
    sha,
    write_json,
)


def main():
    artifact = HOME / "coffee-leaf-b3.tflite"
    config = read_json(HOME / "model-config-b3.json")
    assert sha(artifact) == config["calibration"]["artifact_sha256"]
    interpreter, inp, out = interpreter_for(artifact)
    operations = sorted({op["op_name"] for op in interpreter._get_ops_details()})
    assert "CUSTOM" not in operations
    rows = [row for row in manifest_records() if row["split"] == "val"][:3]
    labels = []
    for row in rows:
        interpreter.set_tensor(inp, image_input(row, "canonical"))
        interpreter.invoke()
        probability = interpreter.get_tensor(out)[0]
        assert np.isfinite(probability).all()
        np.testing.assert_allclose(probability.sum(), 1, atol=1e-4)
        labels.append(int(probability.argmax()))
    assert not ATTEMPTS
    report = dict(
        artifact_sha256=sha(artifact),
        fresh_process=True,
        python_outbound_sockets_blocked=True,
        attempted_connections=len(ATTEMPTS),
        os_firewall_test=False,
        phone_device_tested=False,
        runtime_operations=operations,
        custom_ops_present=False,
        samples=len(rows),
        predicted_indices=labels,
        installed_in_app=False,
    )
    write_json(RUN / "offline_verification.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
