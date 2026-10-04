"""Apply the same image and checkpoint checks to the completed B2 run."""

import json

from b2_model import MANIFEST, RUN, load_model
from b2_train import configured_engine, private_module, protected_identities


def main():
    engine = configured_engine()
    verification = private_module("b1_verify.py", "_efficientnet_b2_verification")
    verification.RUN, verification.MANIFEST = RUN, MANIFEST
    verification.load_model = load_model
    verification.initialize = engine.initialize
    verification.predict = engine.predict
    verification.main()
    report = json.loads((RUN / "training.json").read_text())
    if report["architecture"] != "efficientnet_b2":
        raise ValueError("B2 verification found incorrect architecture metadata")
    unchanged = protected_identities() == report["protected_b0_b1_identities"]
    if not unchanged:
        raise ValueError("Protected B0/B1 files changed during B2 training")
    report["completion_verification"]["protected_b0_b1_files_unchanged"] = unchanged
    report["completion_verification"]["architecture"] = "efficientnet_b2"
    engine.write_json(RUN / "training.json", report)
    engine.write_json(
        RUN / "completion_verification.json", report["completion_verification"]
    )


if __name__ == "__main__":
    main()
