"""Four-model scientific report figure; metrics come only from the final JSON."""

import numpy as np

from compare_model_runtime import LABELS
from compare_models_report import bar_value, chart_values

COLORS = ["#476582", "#178774", "#976CAE", "#B97738"]


def metric_bars(axis, labels, values, title, decimal_rows=()):
    positions = np.arange(len(labels))
    for index, (name, scores) in enumerate(values.items()):
        offset = (index - 1.5) * 0.20
        bars = axis.barh(
            positions + offset,
            scores,
            height=0.18,
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
            fontsize=8.5,
        )
        for position, score in zip(positions, scores):
            if not np.isfinite(score):
                axis.text(0.01, position + offset, "N/A", va="center", fontsize=8.5)
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
        "Deployment status and external scan outcomes",
        loc="left",
        fontsize=13,
        fontweight="bold",
        pad=12,
    )
    rows = []
    for name, model in report["models"].items():
        scans = model["external_scans"]["app"]
        role = (
            "Candidate"
            if model["deployment"]["role"] == "comparison_candidate"
            else "App asset"
        )
        rows.append(
            [
                name.upper(),
                f"{model['parameter_count'] / 1e6:.2f} M",
                f"{model['artifact_bytes'] / 1e6:.2f} MB",
                f"{report['latency']['models'][name]['median_ms']:.1f} ms",
                f"{scans['accepted_n']} / {scans['n']}",
                role,
            ]
        )
    table = axis.table(
        cellText=rows,
        colLabels=[
            "Model",
            "Parameters",
            "File size",
            "CPU\nmedian",
            "Scans\naccepted",
            "Role",
        ],
        colWidths=[0.12, 0.19, 0.16, 0.16, 0.17, 0.20],
        cellLoc="center",
        bbox=[0, 0.62, 1, 0.34],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9.5)
    for (row, _), cell in table.get_celld().items():
        cell.set_edgecolor("#dddddd")
        if row == 0:
            cell.set_facecolor("#eeeeee")
            cell.set_text_props(weight="bold")
    axis.text(
        0,
        0.56,
        paired_note(report),
        fontsize=10.5,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
    )
    axis.text(
        0,
        0.38,
        scan_note(report),
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.6,
        color="#444444",
    )
    axis.text(
        0,
        0.20,
        deployment_note(report),
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
        color="#444444",
    )
    axis.text(
        0,
        0.09,
        "External recall/specificity use each model's frozen\nvalidation-selected binary cutoff.",
        fontsize=10,
        va="top",
        transform=axis.transAxes,
        linespacing=1.5,
        color="#444444",
    )


def paired_note(report):
    lines = ["Matched accuracy differences (percentage points)"]
    for other in ["b0", "b1", "b2"]:
        score = report["paired_accuracy_differences"][f"b3_minus_{other}"][
            "expanded_all_eight"
        ]
        lower, upper = score["percentile_95_interval"]
        lines.append(
            f"B3 − {other.upper()}: {score['difference'] * 100:+.1f} pp (95% CI {lower * 100:+.1f} to {upper * 100:+.1f})"
        )
    return "\n".join(lines)


def scan_note(report):
    lines = []
    for name, model in report["models"].items():
        app = model["external_scans"]["app"]
        value = app["accepted_accuracy"]
        accuracy = "N/A" if value is None else f"{value:.1%}"
        lines.append(
            f"{name.upper()} accepted-scan accuracy: {accuracy}; unsupported accepted: {app['unsupported_false_accepts']}"
        )
    return "\n".join(lines)


def deployment_note(report):
    deployed = report["models"]["b3"]["deployment"]
    if deployed["role"] != "comparison_candidate":
        return "B3 is recorded as an app asset. Physical-phone performance\nremains unverified by this desktop comparison."
    limit = (
        "Exceeds the unchanged 10 MB app limit."
        if not deployed["deployment_eligible"]
        else "Meets the file-size gate; requires app integration."
    )
    return f"B3 is a comparison candidate and is not installed in the app.\n{limit} Gate metrics are computed offline."


def make_figure(report, path):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    models = report["models"]
    with plt.rc_context({"font.family": "DejaVu Sans", "font.size": 10}):
        figure, axes = plt.subplots(2, 2, figsize=(18, 15))
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
            "Internal performance and acceptance coverage",
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
            "EfficientNet-B0, B1, B2 and B3: matched model comparison",
            fontsize=20,
            x=0.035,
            ha="left",
            y=0.98,
        )
        count = models["b0"]["subsets"]["expanded_all_eight"]["raw"]["n"]
        figure.text(
            0.035,
            0.948,
            f"Same {count:,} held-out images at 224px, shared quality policy, separate frozen confidence gates",
            fontsize=12,
            color="#444444",
        )
        figure.text(
            0.14,
            0.028,
            "AUROC measures ranking, not diagnosis accuracy. Fresh desktop CPU timing; physical phones untested. Pretrained initialization differs.",
            fontsize=10,
            color="#444444",
        )
        handles, labels = axes[0, 0].get_legend_handles_labels()
        if models["b3"]["deployment"]["role"] == "comparison_candidate":
            labels[-1] = "B3 candidate"
        figure.legend(
            handles,
            labels,
            loc="upper right",
            bbox_to_anchor=(0.975, 0.985),
            frameon=False,
            ncol=4,
        )
        figure.subplots_adjust(
            left=0.14, right=0.97, bottom=0.07, top=0.90, wspace=0.55, hspace=0.34
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        figure.savefig(path, dpi=160, facecolor="white")
        plt.close(figure)
