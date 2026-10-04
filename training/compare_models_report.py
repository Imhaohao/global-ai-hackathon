"""Matched-set summaries and provenance audits for the two deployed classifiers."""

import csv
from collections import Counter, defaultdict

import imagehash
import numpy as np
from PIL import Image

from compare_model_runtime import (
    LABELS,
    ROOT,
    decisions,
    read_json,
    sha,
    subset,
    summary,
)


def truth_for(rows):
    return np.array([LABELS.index(row["label"]) for row in rows], dtype=np.int64)


def group_key(row):
    return row.get("group", row.get("parent", row["path"]))


def class_acceptance(data, rows, calibration):
    truth = truth_for(rows)
    chosen, accepted, _ = decisions(data["probabilities"], data["quality"], calibration)
    result = {}
    for label, name in enumerate(LABELS):
        actual, selected = truth == label, accepted & (chosen == label)
        correct = actual & selected
        result[name] = dict(
            support=int(actual.sum()),
            accepted_as_class=int(selected.sum()),
            correct_accepted=int(correct.sum()),
            accepted_precision=float(correct.sum() / selected.sum())
            if selected.any()
            else None,
            correct_accepted_recall=float(correct.sum() / actual.sum())
            if actual.any()
            else None,
            true_class_accepted_coverage=float(accepted[actual].mean())
            if actual.any()
            else None,
            enabled=bool(label < 7 and calibration["class_thresholds"][label] <= 1),
        )
    return result


def detailed_summary(data, rows, calibration, labels=None):
    result = summary(data, rows, calibration, labels)
    result["per_class_app"] = class_acceptance(data, rows, calibration)
    result["groups"] = len({group_key(row) for row in rows})
    result["parents"] = len({row.get("parent", row["path"]) for row in rows})
    return result


def matched_subsets(rows, original):
    original_paths = {row["path"] for row in original if row["split"] == "test"}
    predicates = {
        "expanded_all_eight": lambda row: True,
        "original_all_eight": lambda row: row["path"] in original_paths,
        "expanded_common_five": lambda row: LABELS.index(row["label"]) < 5,
        "expanded_common_five_excluding_agml_and_known_exposure": lambda row: (
            unexposed(row) and LABELS.index(row["label"]) < 5
        ),
        "original_common_five": lambda row: (
            row["path"] in original_paths and LABELS.index(row["label"]) < 5
        ),
        "expanded_excluding_agml_and_known_exposure": unexposed,
        "original_excluding_agml_and_known_exposure": lambda row: (
            row["path"] in original_paths and unexposed(row)
        ),
        "original_common_five_excluding_agml_and_known_exposure": lambda row: (
            row["path"] in original_paths
            and unexposed(row)
            and LABELS.index(row["label"]) < 5
        ),
        "peru": lambda row: row["source"] == "peru",
        "reviewed_bracol_additional_views": lambda row: (
            row["source"] == "bracol_expert"
        ),
    }
    indices = {
        name: np.array([i for i, row in enumerate(rows) if rule(row)], dtype=np.int64)
        for name, rule in predicates.items()
    }
    if len(indices["original_all_eight"]) != len(original_paths):
        raise ValueError("Expanded test does not contain the complete original test")
    return indices


def unexposed(row):
    return row["source"] != "agml" and not row.get("pretraining_exposed", False)


def subset_summaries(data, rows, calibration, indices):
    result = {}
    for name, selection in indices.items():
        selected_rows = [rows[int(i)] for i in selection]
        if not selected_rows:
            continue
        labels = list(range(5)) if "common_five" in name else None
        result[name] = detailed_summary(
            subset(data, selection), selected_rows, calibration, labels
        )
    return result


def source_summaries(data, rows, calibration):
    result = {}
    for source in sorted({row["source"] for row in rows}):
        indices = np.array([i for i, row in enumerate(rows) if row["source"] == source])
        selected = [rows[int(i)] for i in indices]
        labels = sorted(set(truth_for(selected).tolist()))
        result[source] = detailed_summary(
            subset(data, indices), selected, calibration, labels
        )
    return result


def group_probe_indices(rows):
    candidates = defaultdict(list)
    for index, row in enumerate(rows):
        candidates[row["source"], group_key(row), row["label"]].append(index)
    rng = np.random.default_rng(20261003)
    return np.array(
        [rng.choice(candidates[key]) for key in sorted(candidates)], dtype=np.int64
    )


def manifest_audit(rows, path, verify_bytes=False):
    groups, parents, hashes = defaultdict(set), defaultdict(set), defaultdict(set)
    missing, changed, invalid = [], [], []
    for row in rows:
        groups[group_key(row)].add(row["split"])
        parents[row["parent"]].add(row["split"])
        hashes[row["sha256"]].add(row["split"])
        image = ROOT / row["path"]
        if not image.is_file():
            missing.append(row["path"])
        elif verify_bytes and sha(image) != row["sha256"]:
            changed.append(row["path"])
        if row["label"] not in LABELS:
            invalid.append(row["path"])
    counts = Counter((row["source"], row["label"], row["split"]) for row in rows)
    return dict(
        manifest_sha256=sha(path),
        rows=len(rows),
        groups=len(groups),
        parents=len(parents),
        splits=dict(Counter(row["split"] for row in rows)),
        cross_split_groups=sum(len(splits) > 1 for splits in groups.values()),
        cross_split_parents=sum(len(splits) > 1 for splits in parents.values()),
        cross_split_exact_hashes=sum(len(splits) > 1 for splits in hashes.values()),
        missing=missing,
        changed_images=changed,
        invalid_labels=invalid,
        all_image_bytes_verified=verify_bytes,
        known_pretraining_exposed=dict(
            Counter(
                row["split"] for row in rows if row.get("pretraining_exposed", False)
            )
        ),
        counts=[
            dict(source=source, label=label, split=split, n=n)
            for (source, label, split), n in sorted(counts.items())
        ],
    )


def audit_manifests(original, expanded, verify_bytes=False):
    audits = {
        "b0": manifest_audit(original, ROOT / "data/manifest.json", verify_bytes),
        "b1": manifest_audit(
            expanded, ROOT / "data/scale_v3_manifest.json", verify_bytes
        ),
    }
    lookup = {row["path"]: row for row in expanded}
    fields = [
        "label",
        "source",
        "parent",
        "group",
        "split",
        "sha256",
        "phash",
        "pretraining_exposed",
    ]
    changed = [
        row["path"]
        for row in original
        if row["path"] not in lookup
        or any(row.get(key) != lookup[row["path"]].get(key) for key in fields)
    ]
    audits["original_assignments_unchanged"] = not changed
    audits["changed_original_records"] = changed
    failures = [
        audit[key]
        for audit in [audits["b0"], audits["b1"]]
        for key in [
            "cross_split_groups",
            "cross_split_parents",
            "cross_split_exact_hashes",
            "missing",
            "changed_images",
            "invalid_labels",
        ]
    ]
    if changed or any(failures):
        raise ValueError("Manifest integrity failed; do not report this comparison")
    return audits


def reference_union(original, expanded):
    references = {}
    for row in original + expanded:
        if row["split"] in {"train", "val"} or row.get("pretraining_exposed", False):
            references[row["path"]] = row
    return list(references.values())


def near_match(row, references, exact, hashes):
    image_path = ROOT / row["path"]
    digest = sha(image_path)
    with Image.open(image_path) as image:
        phash = int(str(imagehash.phash(image.convert("RGB"))), 16)
    if digest in exact:
        return dict(path=row["path"], reason="exact_hash", reference=exact[digest])
    nearby = next((value for value in hashes if (value ^ phash).bit_count() <= 5), None)
    if nearby is not None:
        return dict(
            path=row["path"],
            reason="conservative_phash_candidate",
            reference=references[nearby],
            distance=(nearby ^ phash).bit_count(),
        )
    return None


def external_audit(rows, references, prior_filename):
    prior_path = ROOT / "runs/efficientnet" / prior_filename
    prior = read_json(prior_path)
    excluded_before = set(prior["excluded_paths"])
    exact = {row["sha256"]: row["path"] for row in references}
    hashes = {int(row["phash"]): row["path"] for row in references}
    kept, exclusions = [], []
    for row in rows:
        match = near_match(row, hashes, exact, hashes)
        if match or row["path"] in excluded_before:
            exclusions.append(
                match or dict(path=row["path"], reason="previously_excluded")
            )
        else:
            kept.append(row)
    return kept, dict(
        total=len(rows),
        retained=len(kept),
        excluded=len(exclusions),
        exclusions=exclusions,
        prior_audit_sha256=sha(prior_path),
        reference_paths=len(references),
        method="Recomputed image SHA256 and pHash<=5 against union of both training/validation corpora and B0 known pretraining exposure; preserve prior exclusions",
        qualification="pHash matches are conservatively excluded candidates, not confirmed duplicates; physical plant identity unavailable",
    )


def scan_rows():
    path = ROOT / "data/scans/metadata.csv"
    mapping = {"roya": "rust", "healthy": "healthy", "ojo": "unsupported"}
    with path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return [
        dict(
            path=f"data/scans/images/{row['category']}/{row['file']}",
            label=mapping[row["category"]],
            parent=row["leaf_id"],
            group=row["leaf_id"],
            source="pg26038_scans",
        )
        for row in rows
    ]


def paired_accuracy_interval(rows, first, second, replicates=1000):
    truth = truth_for(rows)
    differences = (second.argmax(1) == truth).astype(float) - (first.argmax(1) == truth)
    groups = defaultdict(list)
    for index, row in enumerate(rows):
        groups[group_key(row)].append(index)
    sums = np.array([differences[indices].sum() for indices in groups.values()])
    counts = np.array([len(indices) for indices in groups.values()])
    rng = np.random.default_rng(20261003)
    deltas = []
    for _ in range(replicates):
        selected = rng.integers(0, len(groups), size=len(groups))
        deltas.append(sums[selected].sum() / counts[selected].sum())
    return dict(
        b1_minus_b0=float(differences.mean()),
        percentile_95_interval=np.quantile(deltas, [0.025, 0.975]).tolist(),
        resamples=replicates,
        group_count=len(groups),
        method="Paired bootstrap of recorded groups; row-weighted accuracy within each bootstrap sample",
        qualification="Groups are capture/parent/duplicate proxies, not guaranteed independent physical plants",
    )


def weak_class_comparison(models):
    result = {}
    for label in ["cercospora", "healthy", "red_spider_mite"]:
        result[label] = {}
        for name, model in models.items():
            clean = model["subsets"]["expanded_all_eight"]
            result[label][name] = dict(
                raw=clean["raw"]["classification"][label],
                app=clean["per_class_app"][label],
                original_test=model["subsets"]["original_all_eight"]["raw"][
                    "classification"
                ][label],
            )
    return result


def metric_bars(axis, labels, values, title, colors, decimal_rows=()):
    positions = np.arange(len(labels))
    for index, (name, scores) in enumerate(values.items()):
        bars = axis.barh(
            positions + (index - 0.5) * 0.34,
            scores,
            height=0.32,
            label=name.upper(),
            color=colors[index],
        )
        axis.bar_label(
            bars,
            labels=[
                bar_value(score, row in decimal_rows)
                for row, score in enumerate(scores)
            ],
            padding=4,
            fontsize=9,
        )
        for position, score in zip(positions, scores):
            if not np.isfinite(score):
                axis.text(
                    0.01,
                    position + (index - 0.5) * 0.34,
                    "N/A",
                    va="center",
                    fontsize=9,
                )
    axis.set_yticks(positions, labels)
    axis.invert_yaxis()
    axis.set_xlim(0, 1.15)
    axis.set_xticks([0, 0.25, 0.5, 0.75, 1], ["0%", "25%", "50%", "75%", "100%"])
    axis.set_title(title, loc="left", fontsize=13, fontweight="bold", pad=12)
    axis.grid(axis="x", alpha=0.2)
    axis.set_axisbelow(True)
    axis.spines[["top", "right", "left"]].set_visible(False)
    axis.tick_params(axis="y", length=0)


def bar_value(value, decimal=False):
    if not np.isfinite(value):
        return ""
    return f"{value:.3f}" if decimal else f"{value:.1%}"


def chart_values(models, field):
    result = {}
    for name, model in models.items():
        clean = model["subsets"]["expanded_all_eight"]
        selectors = {
            "internal": [
                clean["raw"]["accuracy"],
                clean["raw"]["macro_f1"],
                clean["app"]["accepted_accuracy"]
                if clean["app"]["accepted_accuracy"] is not None
                else np.nan,
                clean["app"]["accepted_coverage"],
                model["far_probe"]["raw"]["macro_f1"],
            ],
            "external": [
                model["external_rust"]["auroc"],
                model["external_rust"]["rust_recall"],
                model["external_rust"]["specificity"],
                model["external_scans"]["supported_raw_accuracy"],
            ],
            "classes": [
                clean["raw"]["classification"][label]["f1-score"] for label in LABELS
            ],
        }
        result[name] = selectors[field]
    return result


def footprint_table(axis, report):
    axis.axis("off")
    axis.set_title(
        "Deployment and accepted scan results",
        loc="left",
        fontsize=13,
        fontweight="bold",
        pad=12,
    )
    rows = []
    for name, model in report["models"].items():
        latency = report["latency"]["models"][name]
        scans = model["external_scans"]["app"]
        rows.append(
            [
                name.upper(),
                f"{model['parameter_count'] / 1e6:.2f} M",
                f"{model['artifact_bytes'] / 1e6:.2f} MB",
                f"{latency['median_ms']:.1f} ms",
                f"{scans['accepted_n']} / {scans['n']}",
            ]
        )
    table = axis.table(
        cellText=rows,
        colLabels=[
            "Model",
            "Parameters",
            "File size",
            "CPU\nmedian",
            "Accepted\nscans",
        ],
        colWidths=[0.14, 0.24, 0.18, 0.21, 0.23],
        cellLoc="center",
        loc="upper left",
        bbox=[0, 0.56, 1, 0.30],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    for (row, _), cell in table.get_celld().items():
        cell.set_edgecolor("#dddddd")
        if row == 0:
            cell.set_facecolor("#eeeeee")
            cell.set_text_props(weight="bold")
    delta = report["paired_accuracy_differences"]["expanded_all_eight"]
    lower, upper = delta["percentile_95_interval"]
    axis.text(
        0,
        0.48,
        f"B1 − B0 accuracy: {delta['b1_minus_b0'] * 100:+.1f} percentage points\n"
        f"95% group-bootstrap interval: {lower * 100:+.1f} to {upper * 100:+.1f} pp",
        fontsize=11,
        va="top",
        transform=axis.transAxes,
        linespacing=1.6,
    )
    axis.text(
        0,
        0.26,
        scan_acceptance_note(report),
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.7,
        color="#444444",
    )
    axis.text(
        0,
        0.10,
        "External recall and specificity use each model's frozen\n"
        "validation-selected binary cutoff.",
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
        color="#444444",
    )


def scan_acceptance_note(report):
    lines = []
    for name, model in report["models"].items():
        app = model["external_scans"]["app"]
        score = app["accepted_accuracy"]
        accuracy = "N/A (none accepted)" if score is None else f"{score:.1%}"
        lines.append(
            f"{name.upper()} accepted-scan accuracy: {accuracy}; unsupported accepted: {app['unsupported_false_accepts']}"
        )
    return "\n".join(lines)


def make_figure(report, path):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    models = report["models"]
    colors = ["#476582", "#178774"]
    with plt.rc_context({"font.family": "DejaVu Sans", "font.size": 10}):
        figure, axes = plt.subplots(2, 2, figsize=(16, 11))
        metric_bars(
            axes[0, 0],
            [label.replace("_", " ") for label in LABELS],
            chart_values(models, "classes"),
            "Per-class F1 on the matched expanded test",
            colors,
        )
        metric_bars(
            axes[0, 1],
            [
                "Raw accuracy",
                "Macro F1",
                "Accepted accuracy",
                "Accepted coverage",
                "Synthetic far-view F1",
            ],
            chart_values(models, "internal"),
            "Internal performance and app coverage",
            colors,
        )
        metric_bars(
            axes[1, 0],
            [
                "Rust AUROC",
                "Rust recall",
                "Rust specificity",
                "Supported scan accuracy",
            ],
            chart_values(models, "external"),
            "Previously inspected external stress tests",
            colors,
            decimal_rows=(0,),
        )
        axes[1, 0].axvline(0.5, color="#777777", linestyle="--", linewidth=1, alpha=0.5)
        footprint_table(axes[1, 1], report)
        figure.suptitle(
            "EfficientNet-B0 and B1: actual app-model comparison",
            fontsize=20,
            x=0.035,
            ha="left",
            y=0.98,
        )
        count = models["b0"]["subsets"]["expanded_all_eight"]["raw"]["n"]
        figure.text(
            0.035,
            0.938,
            f"Same {count:,} held-out images, shared brightness policy, separate frozen confidence gates",
            fontsize=12,
            color="#444444",
        )
        figure.text(
            0.14,
            0.03,
            "AUROC measures ranking, not diagnosis accuracy. Desktop CPU only; phones untested. Training data and initialization differ.",
            fontsize=10,
            color="#444444",
        )
        handles, labels = axes[0, 0].get_legend_handles_labels()
        figure.legend(
            handles,
            labels,
            loc="upper right",
            bbox_to_anchor=(0.96, 0.98),
            frameon=False,
            ncol=2,
        )
        figure.subplots_adjust(
            left=0.14, right=0.97, bottom=0.07, top=0.88, wspace=0.55, hspace=0.34
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        figure.savefig(path, dpi=160, facecolor="white")
        plt.close(figure)
