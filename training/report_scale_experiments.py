"""Export the completed scale experiments without reading test predictions."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from model_utils import ROOT


def comparison(name):
    report = json.loads((ROOT / "runs" / name / "training.json").read_text())
    epoch = report["selected_epoch"]
    selected = next(
        (r for r in report["history"] if r["epoch"] == epoch), report["baseline"]
    )
    return dict(
        name=name,
        selected_epoch=epoch,
        baseline=report["baseline"],
        selected=selected,
        last=report["history"][-1],
        history=report["history"],
        test_used_for_selection=False,
        incumbent_retained=epoch == 0,
        manifest_sha256=report.get("manifest_sha256"),
    )


def chart(experiments, path):
    fig, axes = plt.subplots(1, 2, figsize=(11, 4), layout="constrained")
    names = {
        "far_macro_f1": "Smaller leaf view",
        "context_macro_f1": "Wider annotated context",
        "weak_macro_f1": "Weak classes, original view",
    }
    colors = ["#2071a8", "#3b8068", "#a9602d"]
    for ax, experiment in zip(axes, experiments):
        rows = [experiment["baseline"]] + experiment["history"]
        epochs = range(len(rows))
        for (metric, label), color in zip(names.items(), colors):
            values = [100 * (r[metric] - rows[0][metric]) for r in rows]
            ax.plot(epochs, values, marker="o", markersize=4, label=label, color=color)
        ax.axhline(0, color="#666666", linewidth=0.8)
        ax.set(
            title=experiment["name"].replace("_", " "),
            xlabel="Training epoch",
            ylabel="Change in validation F1 (percentage points)",
        )
        ax.spines[["top", "right"]].set_visible(False)
        ax.grid(axis="y", alpha=0.15)
        ax.set_xticks(list(epochs))
    axes[0].legend(fontsize=8, loc="upper left")
    fig.suptitle("Scale gains must also preserve the weak classes", fontsize=14)
    fig.savefig(path, dpi=180)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    experiments = [comparison(name) for name in ["scale_v2", "scale_v3"]]
    artifact = ROOT.parent / "mobile/assets/model/coffee-leaf.tflite"
    result = dict(
        pushed_commit="aa836a0fffdc9c58065d557923211a6d2ecbf865",
        app_sha256=hashlib.sha256(artifact.read_bytes()).hexdigest(),
        experiments=experiments,
        new_peru_photos=1498,
        new_reviewed_bracol_crops=7364,
        candidate_manifest_counts=dict(train=20311, val=5294, test=5868, external=941),
        source_registry_count=len(
            json.loads((ROOT / "sources.json").read_text())["sources"]
        ),
        limitations=[
            "Validation F1 is not confirmed field accuracy.",
            "BRACOL crops are new reviewed annotations on existing photos, not additional independent plants.",
            "Scale padding simulates leaf size changes but cannot cover every camera distance or recover invisible detail.",
            "Grouped splits reduce leakage; available metadata does not establish every physical plant identity.",
            "No new test predictions are used for checkpoint selection.",
        ],
    )
    (out / "scale-training-results.json").write_text(json.dumps(result, indent=2))
    shutil.copy2(ROOT / "sources.json", out / "dataset-sources.json")
    for name in ["label_audit", "crop_overlap_audit", "xinzhai_source_audit"]:
        shutil.copy2(ROOT / "runs/scale_v3" / f"{name}.json", out / f"{name}.json")
    chart(experiments, out / "scale-validation.png")
    print(
        json.dumps(
            {
                r["name"]: dict(
                    selected_epoch=r["selected_epoch"], last_epoch=r["last"]["epoch"]
                )
                for r in experiments
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
