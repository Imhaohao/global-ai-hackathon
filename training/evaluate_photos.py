import argparse
import csv
import json
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from model_utils import ROOT, LABELS, initialize_runtime, load_model, read_records
from export_mobile import raw_tensor
from finetune import predict
from final_evaluation import RUN, ARTIFACT, sha, mobile_predict, decisions, scan_records

SEED = 20261003


def sample_families(records, rng):
    result = []
    for sources in [
        ["agml"],
        ["bracol_leaf", "bracol_symptom"],
        ["rocole"],
        ["coffeeleaf_own_field", "coffeeleaf_rust_and_leaf_miner"],
        ["beans"],
    ]:
        candidates = [
            r for r in records if r["split"] == "test" and r["source"] in sources
        ]
        groups = {
            label: [r for r in candidates if r["label"] == label]
            for label in sorted({r["label"] for r in candidates})
        }
        labels = list(groups)
        rng.shuffle(labels)
        used = set()
        for i in range(4):
            eligible = [
                r for r in groups[labels[i % len(labels)]] if r["group"] not in used
            ]
            chosen = eligible[int(rng.integers(len(eligible)))]
            used.add(chosen["group"])
            result.append(chosen)
    return result


def external_samples(rng):
    audit = json.loads((RUN / "external_audit.json").read_text())
    excluded = set(audit["excluded_paths"])
    binary = [
        r
        for r in json.loads((ROOT / "data/multispec_binary.json").read_text())
        if r["path"] not in excluded
    ]
    picked = []
    for label in ["rust", "not_rust"]:
        pool = [r for r in binary if r["label"] == label]
        picked.extend(pool[int(i)] for i in rng.choice(len(pool), 6, replace=False))
    return [dict(r, split="external_development") for r in picked]


def scan_sample(rng):
    picked = []
    for category in ["healthy", "roya", "ojo"]:
        pool = [r for r in scan_records() if r["category"] == category]
        parents = sorted({r["parent"] for r in pool})
        for parent in rng.choice(parents, 4, replace=False):
            choices = [r for r in pool if r["parent"] == parent]
            picked.append(choices[int(rng.integers(len(choices)))])
    return picked


def photo_rows(selected, name, config, model, baseline, binary_thresholds=None):
    wrapped = [
        dict(r, label="healthy" if r["label"] == "not_rust" else r["label"])
        for r in selected
    ]
    fine_logits, _ = predict(model, wrapped)
    original_logits, _ = predict(baseline, wrapped)
    fine = (fine_logits / config["temperature"]).softmax(1).numpy()
    original = original_logits[:, :5].softmax(1).numpy()
    deployed, quality, timing = mobile_predict(wrapped, "photos_" + name)
    fine_label, fine_accept, fine_state = decisions(fine, quality, config)
    phone_label, phone_accept, phone_state = decisions(deployed, quality, config)
    rows = []
    for i, record in enumerate(selected):
        expected = record["label"]
        row = dict(
            record,
            python_label=LABELS[int(fine_label[i])],
            mobile_label=LABELS[int(phone_label[i])],
            python_score=float(fine[i].max()),
            mobile_score=float(deployed[i].max()),
            python_accepted=bool(fine_accept[i]),
            app_accepted=bool(phone_accept[i]),
            python_state=str(fine_state[i]),
            app_state=str(phone_state[i]),
            mobile_python_disagreement=bool(fine_label[i] != phone_label[i]),
            decision_disagreement=bool(phone_accept[i] != fine_accept[i]),
            desktop_inference_ms=float(timing[i]),
            expected_label=expected,
            correct=LABELS[int(phone_label[i])] == expected,
            expected_category_enabled=expected
            not in ["unsupported", "red_spider_mite"],
        )
        row["original_label"] = (
            LABELS[int(original[i].argmax())] if expected in LABELS[:5] else None
        )
        row["original_score"] = (
            float(original[i].max()) if row["original_label"] else None
        )
        row["original_correct"] = (
            row["original_label"] == expected if row["original_label"] else None
        )
        if binary_thresholds:
            binary = "rust" if deployed[i, 4] >= binary_thresholds[0] else "not_rust"
            old_binary = (
                "rust" if original[i, 4] >= binary_thresholds[1] else "not_rust"
            )
            row.update(
                binary_prediction=binary,
                binary_rust_score=float(deployed[i, 4]),
                correct=binary == expected,
                original_binary_prediction=old_binary,
                original_binary_rust_score=float(original[i, 4]),
                original_binary_correct=old_binary == expected,
            )
        rows.append(row)
    return rows


def summarize_rows(rows):
    accepted = [r for r in rows if r["app_accepted"]]
    compared = [r for r in rows if r["original_correct"] is not None]
    return dict(
        n=len(rows),
        correct=sum(r["correct"] for r in rows),
        rejected=len(rows) - len(accepted),
        accepted_correct=sum(r["correct"] for r in accepted),
        accepted=len(accepted),
        original_supported_n=len(compared),
        original_supported_correct=sum(r["original_correct"] for r in compared),
        mobile_python_disagreements=sum(r["mobile_python_disagreement"] for r in rows),
        acceptance_disagreements=sum(r["decision_disagreement"] for r in rows),
        per_source={
            source: dict(n=len(part), correct=sum(r["correct"] for r in part))
            for source in sorted({r["source"] for r in rows})
            for part in [[r for r in rows if r["source"] == source]]
        },
    )


def contact_sheet(rows, title, output):
    figure, axes = plt.subplots(
        (len(rows) + 3) // 4,
        4,
        figsize=(16, 3.35 * ((len(rows) + 3) // 4)),
        layout="constrained",
    )
    for i, axis in enumerate(axes.flat):
        axis.axis("off")
        if i >= len(rows):
            continue
        row = rows[i]
        axis.imshow(raw_tensor(row["path"])[0].astype("uint8"))
        prediction = row.get("binary_prediction", row["mobile_label"])
        score = row.get("binary_rust_score", row["mobile_score"])
        score_label = "rust score" if "binary_prediction" in row else "score"
        status = "accepted" if row["app_accepted"] else "rejected"
        axis.set_title(
            f"{i + 1}. {row['source']}\nExpected: {row['expected_label']}\nPredicted: {prediction} | {score_label} {score:.1%}\nApp: {status} | {'correct' if row['correct'] else 'error'}",
            fontsize=9,
            color="#14532d" if row["correct"] else "#991b1b",
        )
    figure.suptitle(
        title
        + "\nModel input crops; scores are not confirmed diagnosis probabilities.",
        fontsize=16,
    )
    figure.savefig(output, dpi=140)
    plt.close(figure)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    from pathlib import Path

    destination = Path(args.output)
    destination.mkdir(parents=True, exist_ok=True)
    initialize_runtime()
    config = json.loads((RUN / "calibration.json").read_text())
    final = json.loads((RUN / "final_evaluation.json").read_text())
    frozen = {
        str(p): sha(p)
        for p in [
            ARTIFACT,
            ARTIFACT.parent / "model-config.json",
            RUN / "best.safetensors",
            RUN / "calibration.json",
        ]
    }
    rng = np.random.default_rng(SEED)
    model, baseline = load_model(RUN / "best.safetensors").eval(), load_model().eval()
    groups = {
        "heldout_20": sample_families(read_records(), rng),
        "rust_stress_12": external_samples(rng),
        "external_scans_12": scan_sample(rng),
    }
    thresholds = (
        final["rust_stress"]["fine_tuned"]["threshold"],
        final["rust_stress"]["original"]["threshold"],
    )
    report = dict(
        seed=SEED,
        artifact_path=str(ARTIFACT),
        artifact_sha256=sha(ARTIFACT),
        calibration_sha256=sha(RUN / "calibration.json"),
        sampling="Four held-out crops per training family, randomly stratified by available labels and distinct duplicate groups. Six rust and six NoRust external samples. Four scans per category, distinct leaves.",
        limitations="Illustrative small samples, not independent accuracy estimates. AGML may be pretrained-source exposed. Rust stress source previously inspected. Scans differ from phone photos. No physical phone validation.",
        unsupported_original_labels=LABELS[5:],
        disabled_final_categories=["red_spider_mite"],
        summaries={},
    )
    all_rows = []
    for name, selected in groups.items():
        rows = photo_rows(
            selected,
            name,
            config,
            model,
            baseline,
            thresholds if name == "rust_stress_12" else None,
        )
        report["summaries"][name] = summarize_rows(rows)
        all_rows.extend(dict(r, evaluation=name) for r in rows)
        contact_sheet(
            rows, name.replace("_", " ").title(), destination / (name + ".png")
        )
    report["examples"] = all_rows
    assert frozen == {path: sha(path) for path in frozen}
    report["model_and_app_files_unchanged"] = True
    (destination / "photo-evaluation.json").write_text(json.dumps(report, indent=2))
    columns = sorted({key for row in all_rows for key in row})
    with (destination / "photo-evaluation.csv").open(
        "w", newline="", encoding="utf-8"
    ) as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(all_rows)
    print(json.dumps(report["summaries"], indent=2), flush=True)


if __name__ == "__main__":
    main()
