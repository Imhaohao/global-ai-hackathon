"""Read-only model verification; never calibrate, train, select, or publish."""

import hashlib
import json
import uuid
from collections import Counter, defaultdict

import numpy as np
import torch
from sklearn.metrics import classification_report, f1_score

from model_utils import ROOT, LABELS, initialize_runtime, load_model, read_records
from finetune import predict
from final_evaluation import (
    ARTIFACT,
    RUN,
    accepted_metrics,
    audited_external,
    decisions,
    mobile_predict,
    scan_records,
    sha,
)
from evaluate_additional import binary_metrics


def read(name):
    return json.loads((RUN / name).read_text())


def identities():
    paths = {
        "checkpoint": RUN / "best.safetensors",
        "tflite": ARTIFACT,
        "config": ARTIFACT.parent / "model-config.json",
        "calibration": RUN / "calibration.json",
        "original_hf_checkpoint": ROOT / "models/huyt/model.safetensors",
        "incumbent_manifest": ROOT / "data/manifest.json",
    }
    return {
        key: dict(path=str(path), sha256=sha(path), bytes=path.stat().st_size)
        for key, path in paths.items()
    }


def manifest_audit(filename):
    path = ROOT / "data" / filename
    data = json.loads(path.read_text())
    rows = data["images"]
    by_group = defaultdict(set)
    by_parent = defaultdict(set)
    by_sha = defaultdict(set)
    invalid = []
    missing = []
    for row in rows:
        by_group[row["group"]].add(row["split"])
        by_parent[row["parent"]].add(row["split"])
        by_sha[row["sha256"]].add(row["split"])
        if row["label"] not in LABELS:
            invalid.append(row["path"])
        if not (ROOT / row["path"]).is_file():
            missing.append(row["path"])
    counts = Counter((r["source"], r["label"], r["split"]) for r in rows)
    return dict(
        sha256=sha(path),
        rows=len(rows),
        splits=dict(Counter(r["split"] for r in rows)),
        class_counts=dict(Counter(r["label"] for r in rows)),
        groups=len(by_group),
        cross_split_groups=sum(len(v) > 1 for v in by_group.values()),
        cross_split_parents=sum(len(v) > 1 for v in by_parent.values()),
        cross_split_exact_hashes=sum(len(v) > 1 for v in by_sha.values()),
        invalid_labels=invalid,
        missing_images=missing,
        flagged_pretraining_exposure=dict(
            Counter(r["split"] for r in rows if r.get("pretraining_exposed", False))
        ),
        agml_source_rows=dict(
            Counter(r["split"] for r in rows if r["source"] == "agml")
        ),
        source_label_split_counts=[
            dict(source=s, label=l, split=p, n=n)
            for (s, l, p), n in sorted(counts.items())
        ],
        preparation_audit=data.get("audit", data.get("report", {})),
    )


def raw_metrics(truth, predicted, classes):
    report = classification_report(
        truth,
        predicted,
        labels=classes,
        target_names=[LABELS[i] for i in classes],
        output_dict=True,
        zero_division=0,
    )
    return dict(
        n=len(truth),
        accuracy=float((truth == predicted).mean()),
        macro_f1=float(
            f1_score(truth, predicted, labels=classes, average="macro", zero_division=0)
        ),
        per_class={LABELS[i]: report[LABELS[i]] for i in classes},
    )


def cached_deployed(test):
    cache = np.load(RUN / "deployed_test.npz")
    signature = hashlib.sha256(
        (sha(ARTIFACT) + json.dumps(test, sort_keys=True)).encode()
    ).hexdigest()
    assert str(cache["signature"]) == signature
    assert all(sha(ROOT / r["path"]) == r["sha256"] for r in test)
    fresh, quality, _ = uncached_mobile(test, "all_test")
    assert np.allclose(fresh, cache["probabilities"], atol=1e-6)
    assert np.allclose(quality, cache["quality"], atol=1e-6)
    return fresh, quality


def uncached_mobile(rows, name):
    unique = "verification_" + name + "_" + uuid.uuid4().hex
    assert not (RUN / f"deployed_{unique}.npz").exists()
    return mobile_predict(rows, unique)


def unsupported_details(probabilities, quality, truth, config):
    chosen, accepted, _ = decisions(probabilities, quality, config)
    mask = truth == 7
    return dict(
        n=int(mask.sum()),
        raw_supported_predictions=int(((chosen < 7) & mask).sum()),
        final_false_accepts=int((accepted & mask).sum()),
        disabled_mite_accepts=int(((chosen == 5) & accepted).sum()),
    )


def evaluate(config, test):
    probability, quality = cached_deployed(test)
    truth = np.array([LABELS.index(r["label"]) for r in test])
    common = np.flatnonzero(truth < 5)
    rows = [test[int(i)] for i in common]
    original_logits, _ = predict(load_model().eval(), rows)
    original = original_logits[:, :5].softmax(1).numpy()
    fine = probability[common]
    unexposed = np.array(
        [
            r["source"] != "agml" and not r.get("pretraining_exposed", False)
            for r in rows
        ]
    )
    pairs = {}
    for name, mask in [
        ("all_common", np.ones(len(common), dtype=bool)),
        ("excluding_agml_and_known_exposure", unexposed),
    ]:
        indices = common[mask]
        pairs[name] = dict(
            original_hf=raw_metrics(
                truth[indices], original[mask].argmax(1), list(range(5))
            ),
            bundled_tflite=raw_metrics(
                truth[indices], fine[mask].argmax(1), list(range(5))
            ),
            incumbent_gated=accepted_metrics(
                probability[indices], quality[indices], truth[indices], config
            ),
        )
    stored = np.load(RUN / "test_predictions.npz")
    assert np.array_equal(stored["labels"], truth)
    python = stored["probabilities"]
    chosen, accepted, states = decisions(probability, quality, config)
    py_chosen, py_accepted, py_states = decisions(python, quality, config)
    parity = dict(
        n=len(test),
        top1_disagreements=int((chosen != py_chosen).sum()),
        acceptance_disagreements=int((accepted != py_accepted).sum()),
        confidence_state_disagreements=int((states != py_states).sum()),
        maximum_probability_error=float(np.abs(probability - python).max()),
        evidence="All4571 TFLite test predictions freshly rerun with a new cache name; image bytes verified against manifest hashes. Original complete checkpoint predictions tied to unchanged recorded checkpoint; fresh checkpoint sample below.",
    )
    fresh = fresh_parity(test, probability, quality, python, config)
    return dict(
        comparable_five_classes=pairs,
        comparison_rule="Original first-five logits are the exact reordered pretrained head; synthetic added outputs are excluded from original baseline. All eight incumbent outputs compete; new/unsupported predictions count as errors on five-class truth.",
        all_eight_raw=raw_metrics(truth, chosen, list(range(8))),
        all_eight_gated=accepted_metrics(probability, quality, truth, config),
        unsupported=unsupported_details(probability, quality, truth, config),
        parity=parity,
        fresh_parity=fresh,
        cached_original_top1_disagreements=int(
            (original.argmax(1) != stored["baseline"][common, :5].argmax(1)).sum()
        ),
    )


def fresh_parity(test, probability, quality, python, config):
    indices = []
    rng = np.random.default_rng(20261003)
    for label in LABELS:
        pool = [i for i, r in enumerate(test) if r["label"] == label]
        indices.extend(map(int, rng.choice(pool, min(12, len(pool)), replace=False)))
    rows = [test[i] for i in indices]
    logits, _ = predict(load_model(RUN / "best.safetensors").eval(), rows)
    fresh = (logits / config["temperature"]).softmax(1).numpy()
    actual, actual_quality, _ = uncached_mobile(rows, "parity")
    first = decisions(actual, actual_quality, config)
    second = decisions(fresh, actual_quality, config)
    assert np.allclose(actual, probability[indices], atol=1e-6)
    assert np.allclose(actual_quality, quality[indices], atol=1e-6)
    return dict(
        n=len(rows),
        top1_disagreements=int((first[0] != second[0]).sum()),
        acceptance_disagreements=int((first[1] != second[1]).sum()),
        confidence_state_disagreements=int((first[2] != second[2]).sum()),
        maximum_probability_error=float(np.abs(actual - fresh).max()),
        stored_checkpoint_probability_difference=float(
            np.abs(fresh - python[indices]).max()
        ),
        fresh_tflite_matches_full_test_cache=True,
    )


def separate_sources(external, scans, config, previous):
    probability, quality, _ = uncached_mobile(external, "rust_stress")
    wrapped = [
        dict(r, label="rust" if r["label"] == "rust" else "healthy") for r in external
    ]
    logits, _ = predict(load_model().eval(), wrapped)
    truth = np.array([r["label"] == "rust" for r in external], dtype=int)
    original = logits[:, :5].softmax(1)[:, 4].numpy()
    old = previous["rust_stress"]
    stress = dict(
        status="Previously inspected development stress test; not a new untouched test.",
        fine_tuned=binary_metrics(
            probability[:, 4], truth, old["fine_tuned"]["threshold"]
        ),
        original=binary_metrics(original, truth, old["original"]["threshold"]),
        threshold_policy="Reuse each model's own previously validation-selected binary threshold; no threshold or calibration changes.",
        no_rust_is_not_healthy=True,
    )
    chosen, accepted, _ = decisions(probability, quality, config)
    negative = truth == 0
    stress["frozen_app_rust_decisions"] = dict(
        accepted_rust_on_Rust=int(((chosen == 4) & accepted & ~negative).sum()),
        accepted_rust_on_NoRust=int(((chosen == 4) & accepted & negative).sum()),
        all_accepted=int(accepted.sum()),
        n=len(truth),
        note="NoRust does not supply multiclass ground truth; other accepted disease labels cannot be scored as correct or incorrect.",
    )
    probability, quality, _ = uncached_mobile(scans, "scans")
    truth = np.array([LABELS.index(r["label"]) for r in scans])
    scan = accepted_metrics(probability, quality, truth, config)
    scan.update(
        status="Previously evaluated separate-source scan stress test; not a new untouched test.",
        independent_leaves=len({r["parent"] for r in scans}),
        unsupported=unsupported_details(probability, quality, truth, config),
        supported_accuracy=float(
            (probability.argmax(1)[truth < 7] == truth[truth < 7]).mean()
        ),
    )
    return stress, scan


def candidates():
    result = {}
    for name in ["scale_v2", "scale_v3"]:
        folder = ROOT / "runs" / name
        data = json.loads((folder / "training.json").read_text())
        assert data["selected_epoch"] == 0
        result[name] = dict(
            selected_epoch=0,
            epochs_completed=len(data["history"]),
            max_epochs=data.get("max_epochs", 6),
            candidate_checkpoint_exists=(folder / "candidate.safetensors").exists(),
            candidate_exports=[
                str(p)
                for pattern in ["*.tflite", "*.onnx", "*.safetensors"]
                for p in folder.rglob(pattern)
            ],
            baseline=data["baseline"],
            last_validation=data["history"][-1],
            all_eligible=[r["eligible"] for r in data["history"]],
            test_used_for_selection=data["test_used_for_selection"],
            selection=data["selection"],
        )
    return result


def main():
    initialize_runtime()
    before = identities()
    previous = read("final_evaluation.json")
    for key, field in [
        ("checkpoint", "checkpoint_sha256"),
        ("tflite", "artifact_sha256"),
        ("calibration", "calibration_sha256"),
        ("incumbent_manifest", "manifest_sha256"),
    ]:
        assert before[key]["sha256"] == previous[field]
    config = read("calibration.json")
    metadata = json.loads((ARTIFACT.parent / "model-config.json").read_text())
    assert (
        metadata["calibration"] == config
        and metadata["calibration_sha256"] == before["calibration"]["sha256"]
    )
    records = read_records()
    test = [r for r in records if r["split"] == "test"]
    results = evaluate(config, test)
    manifests = {
        name: manifest_audit(file)
        for name, file in [
            ("incumbent", "manifest.json"),
            ("scale_v2", "scale_v2_manifest.json"),
            ("scale_v3", "scale_v3_manifest.json"),
        ]
    }
    latest = json.loads((ROOT / "data/scale_v3_manifest.json").read_text())["images"]
    external, audit = audited_external(
        latest, filename="post_scale_external_audit.json"
    )
    audit["retained_by_label"] = dict(Counter(r["label"] for r in external))
    audit["scope"] = (
        "Incumbent plus both candidate manifests: train/validation and known exposed groups; candidates were never deployed."
    )
    scans, scan_audit = audited_external(
        latest, scan_records(), "post_scale_scan_audit.json"
    )
    scan_audit["retained_by_label"] = dict(Counter(r["label"] for r in scans))
    stress, scan = separate_sources(external, scans, config, previous)
    context = json.loads(
        (ROOT / "runs/scale_v2/context_annotation_audit.json").read_text()
    )
    report = dict(
        identity_before=before,
        model_parameters=sum(
            p.numel() for p in load_model(RUN / "best.safetensors").parameters()
        ),
        under_10_decimal_MB=before["tflite"]["bytes"] < 10000000,
        evaluation=results,
        manifests=manifests,
        candidates=candidates(),
        external_rust_stress=stress,
        external_audit_after_new_sources=audit,
        scans=scan,
        scan_audit_after_new_sources=scan_audit,
        context_summary=context["summary"],
        context_evidence=str(ROOT / "runs/scale_v2/context_annotation_audit.json"),
        scale_v3_label_audit=json.loads(
            (ROOT / "runs/scale_v3/label_audit.json").read_text()
        ),
        scale_v3_crop_overlap_audit=json.loads(
            (ROOT / "runs/scale_v3/crop_overlap_audit.json").read_text()
        ),
        quality=previous["quality"],
        phone_contract=dict(
            labels=metadata["labels"],
            app_condition_keys=metadata["app_condition_keys"],
            accept_thresholds=config["class_thresholds"],
            confident_thresholds=config["confident_thresholds"],
            quality=config["quality"],
            input="float32 raw RGB0..255 NHWC [1,224,224,3]; shortest side256 then center224; normalization and calibrated softmax in graph; desktop bicubic; native phone resize/JPEG unvalidated",
            disabled_class="red_spider_mite",
            unsupported_always_rejected=True,
        ),
        original_model_pinned_revision=metadata["model_revision"],
        physical_phone_tested=False,
    )
    report["context_validation_qualification"] = (
        "Scale_v3 changes training dataset only. Context validation still uses canonical center crop:114 RoCoLe validation contexts retain less than50% of whole-leaf bounding-box area, and2 CoffeeLeaf validation contexts retain less than50% of localized target-box area. Box-area coverage does not prove symptom visibility. The far probe uses full-image scale_view at0.65 and preserves the source-image extent; it does not center-crop the padded view. Context-validation geometry was not changed and candidates were not reselected."
    )
    report["cache_verification"] = (
        "All internal test, external rust/NoRust and scan TFLite predictions were recomputed under new unique cache names; calibration frozen. All internal test image bytes matched manifest SHA256s. Existing complete test cache numerically matched the fresh inference within1e-6. The general mobile_predict cache signature alone is insufficient to detect changed image bytes or preprocessing code."
    )
    report["preprocessing_code_sha256"] = {
        name: sha(ROOT / name)
        for name in ["export_mobile.py", "model_utils.py", "final_evaluation.py"]
    }
    report["scans"] = dict(
        report["scans"],
        status="Previously evaluated separate-source scan stress test; not a new untouched test in this verification.",
    )
    assert identities() == before
    report["identity_after"] = identities()
    report["frozen_artifacts_unchanged"] = True
    (RUN / "post_scale_verification.json").write_text(json.dumps(report, indent=2))
    compact = dict(
        identity=before,
        parameters=report["model_parameters"],
        under_10MB=report["under_10_decimal_MB"],
        common_class_results=results["comparable_five_classes"],
        gated=results["all_eight_gated"],
        unsupported=results["unsupported"],
        parity=results["parity"],
        fresh_parity=results["fresh_parity"],
        external_after_new_sources=audit,
        candidate_selected_epochs={
            k: v["selected_epoch"] for k, v in report["candidates"].items()
        },
        frozen_artifacts_unchanged=True,
        report=str(RUN / "post_scale_verification.json"),
    )
    print(json.dumps(compact, indent=2), flush=True)


if __name__ == "__main__":
    main()
