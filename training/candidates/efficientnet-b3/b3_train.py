"""Reuse B2's orchestration and B1's unchanged training engine for B3."""

import json

from b3_model import (
    B3Dataset,
    HOME,
    MANIFEST,
    MODEL_DIR,
    ROOT,
    RUN,
    download_pretrained,
    load_model,
    private_module,
    sha256,
)

SHARED_FILES = [
    "b1_train.py",
    "b1_model.py",
    "b1_verify.py",
    "b2_train.py",
    "b2_model.py",
    "train_scale.py",
    "train_scale_balanced.py",
    "model_utils.py",
    "export_b1.py",
    "export_b2.py",
    "compare_model_runtime.py",
]


def shared_identities():
    return {name: sha256(ROOT / name) for name in SHARED_FILES}


def configured_engine():
    engine = private_module("b1_train.py", "_b3_shared_training_engine")
    engine.RUN, engine.MODEL_DIR, engine.MANIFEST = RUN, MODEL_DIR, MANIFEST
    engine.B1Dataset = B3Dataset
    engine.load_model, engine.download_pretrained = load_model, download_pretrained
    return engine


def main():
    adapter = private_module("b2_train.py", "_b3_b2_orchestration")
    adapter.RUN, adapter.MODEL_DIR, adapter.MANIFEST = RUN, MODEL_DIR, MANIFEST
    adapter.B2Dataset, adapter.load_model = B3Dataset, load_model
    adapter.configured_engine = configured_engine
    adapter.download_pretrained = download_pretrained
    original_report = adapter.initial_report
    original_validate = adapter.validate_existing_run

    def run_identity(identity):
        identity.update(
            architecture="efficientnet_b3",
            wrapper_sha256=sha256(HOME / "b3_train.py"),
            model_code_sha256=sha256(HOME / "b3_model.py"),
            shared_code_sha256=shared_identities(),
        )
        original_validate(identity)

    def initial_report(model, rows, provenance, identity):
        report = original_report(model, rows, provenance, identity)
        report["architecture"] = "efficientnet_b3"
        report["recipe"]["teacher"] = (
            "B3 learns dataset labels independently; no model teacher targets"
        )
        report["comparison_limits"] = (
            "B1/B2/B3 share the exact vetted dataset, splits, seed, augmentation, "
            "training code and 224-pixel inputs. ImageNet initialization recipes "
            "and native resolutions differ; B0 also used earlier coffee data. "
            "This compares trained systems, not architecture alone."
        )
        report["source_chat"] = "01a1032b-3903-7212-a9e9-1669802a5976"
        report["app_artifact_size_limit_bytes"] = 10_000_000
        return report

    adapter.validate_existing_run, adapter.initial_report = run_identity, initial_report
    before = shared_identities()
    adapter.main()
    assert before == shared_identities(), "Shared recipe changed during B3 training"
    report = json.loads((RUN / "training.json").read_text())
    report["shared_recipe_unchanged"] = True
    configured_engine().write_json(RUN / "training.json", report)


if __name__ == "__main__":
    main()
