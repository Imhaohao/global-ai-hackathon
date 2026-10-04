"""Run the original completion checks against the selected B3 checkpoint."""

import json

from b3_model import HOME, MANIFEST, ROOT, RUN, load_model, private_module, sha256
from b3_train import configured_engine, shared_identities


def check_shared_recipe(identity):
    expected, actual = identity["shared_code_sha256"], shared_identities()
    changes = [name for name in expected if actual[name] != expected[name]]
    if not changes:
        return None
    assert changes == ["b2_train.py"], f"Training dependencies changed: {changes}"
    audit = json.loads((RUN / "orchestration_change_audit.json").read_text())
    assert audit["matches_original"]
    assert audit["original_hash"] == expected["b2_train.py"]
    assert audit["current_hash"] == actual["b2_train.py"]
    return audit


def main():
    identity = json.loads((RUN / "run_identity.json").read_text())
    orchestration_audit = check_shared_recipe(identity)
    assert identity["wrapper_sha256"] == sha256(HOME / "b3_train.py")
    assert identity["model_code_sha256"] == sha256(HOME / "b3_model.py")
    engine = configured_engine()
    verifier = private_module("b1_verify.py", "_b3_completion_verification")
    verifier.RUN, verifier.MANIFEST = RUN, MANIFEST
    verifier.load_model = load_model
    verifier.initialize, verifier.predict = engine.initialize, engine.predict
    verifier.main()
    report = json.loads((RUN / "completion_verification.json").read_text())
    contexts = json.loads((RUN / "input_verification.json").read_text())[
        "training_validation_context_sha256"
    ]
    assert all(sha256(ROOT / path) == value for path, value in contexts.items())
    report.update(
        architecture="efficientnet_b3",
        shared_recipe_unchanged=True,
        context_images_verified=len(contexts),
        orchestration_source_change=orchestration_audit,
    )
    engine.write_json(RUN / "completion_verification.json", report)
    training = json.loads((RUN / "training.json").read_text())
    training["shared_recipe_unchanged"] = True
    training["completion_verification"] = report
    engine.write_json(RUN / "training.json", training)


if __name__ == "__main__":
    main()
