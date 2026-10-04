"""Read-only source-annotation trace and actual center-crop coverage audit."""

import io
import json
from collections import Counter
from pathlib import Path

import pyarrow.parquet as pq
from PIL import Image

from audit_scale_labels import MANIFEST, RUN, annotations, intersection, sha
from model_utils import ROOT
from prepare_scale_context import expand_box


def evidence(row, original, annotation_index, category, box, expanded, kind):
    bounds = tuple(round(value) for value in expanded)
    with Image.open(ROOT / row["context_path"]) as image:
        width, height = image.size
    short = int(
        224
        / json.loads((ROOT / "models/huyt/config.json").read_text())["pretrained_cfg"][
            "crop_pct"
        ]
    )
    resized = (
        (short, int(short * height / width))
        if width <= height
        else (int(short * width / height), short)
    )
    left, top = [round((value - 224) / 2) for value in resized]
    sx, sy = (bounds[2] - bounds[0]) / resized[0], (bounds[3] - bounds[1]) / resized[1]
    retained = (
        bounds[0] + left * sx,
        bounds[1] + top * sy,
        bounds[0] + (left + 224) * sx,
        bounds[1] + (top + 224) * sy,
    )
    coverage = intersection(box, retained) / max(
        1, (box[2] - box[0]) * (box[3] - box[1])
    )
    return dict(
        path=row["path"],
        context_path=row["context_path"],
        source=row["source"],
        split=row["split"],
        group=row["group"],
        mapped_label=row["label"],
        source_image=original,
        annotation_index=annotation_index,
        source_category=category,
        target_kind=kind,
        bbox_xyxy=box,
        expanded_crop_xyxy=bounds,
        canonical_retained_xyxy=retained,
        retained_target_box_fraction=coverage,
        review=coverage < 0.9,
    )


def coffee_rows(rows):
    base = ROOT / "data/coffeeleaf_co/extracted/CoffeeLeaf-CO-v2"
    lookup = {p.stem: p for p in (base / "images").rglob("*.jpg")}
    result = []
    for row in rows:
        if not row["source"].startswith("coffeeleaf_"):
            continue
        stem, index = Path(row["path"]).stem.rsplit("_", 1)
        width, height, boxes = annotations(str(lookup[stem]))
        category, box = boxes[int(index)]
        result.append(
            evidence(
                row,
                str(lookup[stem].relative_to(ROOT)),
                int(index),
                category,
                box,
                expand_box(box, width, height, 2.5),
                "localized symptom/damage bounding box",
            )
        )
    return result


def rocole_rows(rows):
    lookup = {Path(r["path"]).stem: r for r in rows if r["source"] == "rocole"}
    result = []
    for file in sorted((ROOT / "data/rocole/data").glob("*.parquet")):
        for batch in pq.ParquetFile(file).iter_batches(
            batch_size=32, columns=["image", "objects"]
        ):
            for original in batch.to_pylist():
                name = Path(original["image"]["path"]).stem
                if name not in lookup:
                    continue
                with Image.open(io.BytesIO(original["image"]["bytes"])) as image:
                    width, height = image.size
                x, y, w, h = original["objects"]["bbox"][0]
                assert max(x, y, w, h) > 1, "Normalized box requires explicit scaling"
                box = (x, y, x + w, y + h)
                result.append(
                    evidence(
                        lookup[name],
                        original["image"]["path"],
                        0,
                        original["objects"]["categories"][0],
                        box,
                        expand_box(box, width, height, 1.6),
                        "whole target leaf bounding box",
                    )
                )
    return result


def main():
    before = sha(MANIFEST)
    rows = [
        r for r in json.loads(MANIFEST.read_text())["images"] if "context_path" in r
    ]
    results = coffee_rows(rows) + rocole_rows(rows)
    assert len(results) == len(rows)
    totals = {}
    for source in sorted({r["source"] for r in results}):
        subset = [r for r in results if r["source"] == source]
        totals[source] = dict(
            n=len(subset),
            target_kind=subset[0]["target_kind"],
            counts={
                f"under_{threshold:g}": sum(
                    r["retained_target_box_fraction"] < threshold - 1e-9 for r in subset
                )
                for threshold in [1, 0.9, 0.5]
            },
            under_half_by_split=dict(
                Counter(
                    r["split"]
                    for r in subset
                    if r["retained_target_box_fraction"] < 0.5
                )
            ),
        )
    assert before == sha(MANIFEST)
    report = dict(
        manifest_sha256=before,
        manifest_unchanged=True,
        summary=totals,
        rows=results,
        limitations="Bounding-box area retention is not a diagnosis or symptom-pixel measurement. RoCoLe boxes describe whole leaves, CoffeeLeaf boxes describe localized symptoms/damage. Unannotated background and correctness of publisher labels have not been independently verified. Review flags do not change the active manifest or training run.",
    )
    path = RUN / "context_annotation_audit.json"
    path.write_text(json.dumps(report, indent=2))
    audit_path = RUN / "label_audit.json"
    audit = json.loads(audit_path.read_text())
    audit["context"]["exact_canonical_coverage_summary"] = totals
    audit["context"]["annotation_evidence_file"] = str(path.relative_to(ROOT))
    audit_path.write_text(json.dumps(audit, indent=2))
    print(json.dumps(totals, indent=2), flush=True)


if __name__ == "__main__":
    main()
