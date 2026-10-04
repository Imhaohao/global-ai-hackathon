"""Verify the actual bundled B2 in a fresh process with Python sockets blocked."""

import json
import socket

ATTEMPTS = []


def blocked(*args, **kwargs):
    ATTEMPTS.append("outbound_socket")
    raise RuntimeError("Outbound socket access disabled for offline verification")


socket.socket.connect = blocked
socket.socket.connect_ex = blocked
socket.create_connection = blocked

import numpy as np  # noqa: E402

from compare_model_runtime import (  # noqa: E402
    ROOT,
    image_input,
    interpreter_for,
    manifest_records,
    read_json,
    sha,
    write_json,
)


def main():
    assets = ROOT.parent / "mobile/assets/model"
    artifact = assets / "coffee-leaf-b2.tflite"
    config = read_json(assets / "model-config-b2.json")
    assert sha(artifact) == config["calibration"]["artifact_sha256"]
    interpreter, inp, out = interpreter_for(artifact)
    operations = sorted({op["op_name"] for op in interpreter._get_ops_details()})
    assert "CUSTOM" not in operations
    rows = [row for row in manifest_records() if row["split"] == "val"][:3]
    labels = []
    for row in rows:
        interpreter.set_tensor(inp, image_input(row, "canonical"))
        interpreter.invoke()
        probabilities = interpreter.get_tensor(out)[0]
        assert np.isfinite(probabilities).all()
        np.testing.assert_allclose(probabilities.sum(), 1, atol=1e-4)
        labels.append(int(probabilities.argmax()))
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
        app_load="Bundled coffee-leaf-b2.tflite; selected local asset with CPU delegates []",
    )
    write_json(ROOT / "runs/efficientnet_b2/offline_verification.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
