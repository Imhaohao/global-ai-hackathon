"""Scientific figure for three matched app classifiers; no model inference."""

import numpy as np

from compare_model_runtime import LABELS
from compare_models_report import bar_value, chart_values

COLORS = ["#476582", "#178774", "#976CAE"]


def metric_bars(axis, labels, values, title, decimal_rows=()):
    positions = np.arange(len(labels))
    for index, (name, scores) in enumerate(values.items()):
        offset = (index - 1) * 0.24
        bars = axis.barh(
            positions + offset,
            scores,
            height=0.22,
            label=name.upper(),
            color=COLORS[index],
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
                axis.text(0.01, position + offset, "N/A", va="center", fontsize=9)
    axis.set_yticks(positions, labels)
    axis.invert_yaxis()
    axis.set_xlim(0, 1.15)
    axis.set_xticks([0, 0.25, 0.5, 0.75, 1], ["0%", "25%", "50%", "75%", "100%"])
    axis.set_title(title, loc="left", fontsize=13, fontweight="bold", pad=12)
    axis.grid(axis="x", alpha=0.2)
    axis.set_axisbelow(True)
    axis.spines[["top", "right", "left"]].set_visible(False)
    axis.tick_params(axis="y", length=0)


def deployment_table(axis, report):
    axis.axis("off")
    axis.set_title(
        "Deployment and external scan outcomes",
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
        bbox=[0, 0.61, 1, 0.34],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    for (row, _), cell in table.get_celld().items():
        cell.set_edgecolor("#dddddd")
        if row == 0:
            cell.set_facecolor("#eeeeee")
            cell.set_text_props(weight="bold")
    axis.text(
        0,
        0.54,
        paired_note(report),
        fontsize=10.5,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
    )
    axis.text(
        0,
        0.33,
        scan_note(report),
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.6,
        color="#444444",
    )
    axis.text(
        0,
        0.12,
        "External recall/specificity use each model's frozen\nvalidation-selected binary cutoff.",
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
        color="#444444",
    )


def paired_note(report):
    lines = []
    for name in ["b2_minus_b0", "b2_minus_b1"]:
        score = report["paired_accuracy_differences"][name]["expanded_all_eight"]
        lower, upper = score["percentile_95_interval"]
        lines.append(
            f"B2 − {score['first'].upper()} accuracy: {score['difference'] * 100:+.1f} percentage points"
        )
        lines.append(
            f"95% group-bootstrap interval: {lower * 100:+.1f} to {upper * 100:+.1f} pp"
        )
    return "\n".join(lines)


def scan_note(report):
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
    with plt.rc_context({"font.family": "DejaVu Sans", "font.size": 10}):
        figure, axes = plt.subplots(2, 2, figsize=(17, 13))
        metric_bars(
            axes[0, 0],
            [label.replace("_", " ") for label in LABELS],
            chart_values(models, "classes"),
            "Per-class F1 on the matched expanded test",
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
            decimal_rows=(0,),
        )
        axes[1, 0].axvline(0.5, color="#777777", linestyle="--", linewidth=1, alpha=0.5)
        deployment_table(axes[1, 1], report)
        figure.suptitle(
            "EfficientNet-B0, B1 and B2: actual app-model comparison",
            fontsize=20,
            x=0.035,
            ha="left",
            y=0.98,
        )
        count = models["b0"]["subsets"]["expanded_all_eight"]["raw"]["n"]
        figure.text(
            0.035,
            0.944,
            f"Same {count:,} held-out images at 224px, shared brightness policy, separate frozen confidence gates",
            fontsize=12,
            color="#444444",
        )
        figure.text(
            0.14,
            0.028,
            "AUROC measures ranking, not diagnosis accuracy. Desktop CPU only; physical phones untested. Training initialization differs.",
            fontsize=10,
            color="#444444",
        )
        handles, labels = axes[0, 0].get_legend_handles_labels()
        figure.legend(
            handles,
            labels,
            loc="upper right",
            bbox_to_anchor=(0.97, 0.985),
            frameon=False,
            ncol=3,
        )
        figure.subplots_adjust(
            left=0.14, right=0.97, bottom=0.07, top=0.89, wspace=0.55, hspace=0.34
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        figure.savefig(path, dpi=160, facecolor="white")
        plt.close(figure)
