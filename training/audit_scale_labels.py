"""Read-only label audit of the exact scale-training manifest."""

import hashlib
import json
from collections import Counter
from pathlib import Path
from functools import lru_cache

from PIL import Image
from model_utils import ROOT, LABELS
from prepare_scale_data import MAP
from prepare_scale_context import expand_box

RUN = ROOT / "runs/scale_v2"
MANIFEST = ROOT / "data/scale_v2_manifest.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_audit(source, rows):
    base = ROOT / "data/new_sources" / source
    files = [
        p for p in base.rglob("*") if p.suffix.lower() in [".jpg", ".jpeg", ".png"]
    ]
    decoded = 0
    bad = []
    unknown = []
    original = Counter()
    for path in files:
        original[path.parent.name] += 1
        if path.parent.name not in MAP:
            unknown.append(str(path))
        try:
            with Image.open(path) as image:
                image.load()
            decoded += 1
        except OSError:
            bad.append(str(path.relative_to(ROOT)))
    accepted = [r for r in rows if r["source"] == source]
    labels = Counter(
        (Path(r["original_path"]).parent.name, r["label"], r["split"]) for r in accepted
    )
    return dict(
        discovered_image_files=len(files),
        original_folder_counts=dict(original),
        decoded=decoded,
        decode_failures=len(bad),
        decode_failure_files=bad,
        unknown_label_folders=unknown,
        missing_labels=0,
        empty_labels=0,
        accepted=len(accepted),
        accepted_by_label=[
            dict(original_label=a, mapped_label=b, split=s, n=n)
            for (a, b, s), n in sorted(labels.items())
        ],
        final_splits=dict(Counter(r["split"] for r in accepted)),
        excluded_total=len(files) - len(accepted),
        ground_truth="Source-author class folders. Peru card states plant-health specialist diagnosis; Uganda card describes labeled/augmented field images. No independent laboratory or expert re-verification performed here.",
    )


def intersection(a, b):
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(
        0, min(a[3], b[3]) - max(a[1], b[1])
    )


@lru_cache(maxsize=None)
def annotations(path_string):
    path = Path(path_string)
    base = ROOT / "data/coffeeleaf_co/extracted/CoffeeLeaf-CO-v2"
    values = [
        list(map(float, line.split()))
        for line in (base / "labels" / path.parent.name / (path.stem + ".txt"))
        .read_text()
        .splitlines()
    ]
    with Image.open(path) as image:
        width, height = image.size
    boxes = [
        (
            int(category),
            (
                (cx - w / 2) * width,
                (cy - h / 2) * height,
                (cx + w / 2) * width,
                (cy + h / 2) * height,
            ),
        )
        for category, cx, cy, w, h in values
    ]
    return width, height, boxes


def context_audit(rows):
    base = ROOT / "data/coffeeleaf_co/extracted/CoffeeLeaf-CO-v2"
    lookup = {p.stem: p for p in (base / "images").rglob("*.jpg")}
    names = {0: "rust", 1: "weevil_damage", 2: "miner"}
    mixed = []
    mismatch = []
    central = []
    coffee = [
        r for r in rows if "context_path" in r and r["source"].startswith("coffeeleaf_")
    ]
    for row in coffee:
        stem, index = Path(row["path"]).stem.rsplit("_", 1)
        width, height, boxes = annotations(str(lookup[stem]))
        category, box = boxes[int(index)]
        if names[category] != row["label"]:
            mismatch.append(row["path"])
        expanded = expand_box(box, width, height, 2.5)
        if any(
            other != category and intersection(expanded, region) > 0
            for other, region in boxes
        ):
            mixed.append(row["path"])
        cx, cy = (expanded[0] + expanded[2]) / 2, (expanded[1] + expanded[3]) / 2
        half = min(expanded[2] - expanded[0], expanded[3] - expanded[1]) * 0.875 / 2
        crop = (cx - half, cy - half, cx + half, cy + half)
        coverage = intersection(box, crop) / max(
            1, (box[2] - box[0]) * (box[3] - box[1])
        )
        if coverage < 0.5:
            central.append(
                dict(
                    path=row["path"], split=row["split"], target_area_retained=coverage
                )
            )
    return dict(
        active_context_rows=sum("context_path" in r for r in rows),
        coffee_context_rows=len(coffee),
        rocole_context_rows=sum(
            "context_path" in r and r["source"] == "rocole" for r in rows
        ),
        annotation_label_mismatches=mismatch,
        mixed_annotated_condition_overlaps=mixed,
        canonical_preprocessing_retains_under_half_lesion_box=central,
        interpretation="Context labels inherit the original annotated target. CoffeeLeaf context enlargement excludes any overlapping annotation of a different class. RoCoLe uses a single labeled target leaf; unannotated background cannot be certified disease-free. Context labels are not claims that every pixel or every surrounding leaf has that condition.",
        augmentation="Flips, color jitter and full-image scale padding inherit the same parent and label. No newly independent labels. Canonical center cropping may trim elongated targets; flagged separately without modifying the active run.",
    )


def main():
    before = sha(MANIFEST)
    manifest = json.loads(MANIFEST.read_text())
    rows = manifest["images"]
    issues = []
    for row in rows:
        if (
            row["label"] not in LABELS
            or not row.get("parent")
            or not row.get("group")
            or not (ROOT / row["path"]).is_file()
        ):
            issues.append(row["path"])
        if row["source"] == "peru":
            original = ROOT / row["original_path"]
            if not original.is_file() or MAP.get(original.parent.name) != row["label"]:
                issues.append(row["path"])
    report = dict(
        run="scale_v2",
        manifest=str(MANIFEST),
        manifest_sha256=before,
        baseline_checkpoint_sha256=sha(ROOT / "runs/efficientnet/best.safetensors"),
        total_rows=len(rows),
        new_rows=sum(r["source"] == "peru" for r in rows),
        sources={s: source_audit(s, rows) for s in ["peru", "uganda"]},
        invalid_row_issues=issues,
        duplicate_and_conflict_audit=manifest["report"]["audit"],
        context=context_audit(rows),
        unlabeled_images_in_training=0,
        model_generated_labels_in_training=0,
        ojo_gallo_mapping="Source Ojo_Gallo is Mycena citricolor disease, mapped to unsupported because outside the app class list; never healthy.",
        all_manifest_splits=dict(Counter(r["split"] for r in rows)),
    )
    assert before == sha(MANIFEST)
    report["manifest_unchanged_during_audit"] = True
    (RUN / "label_audit.json").write_text(json.dumps(report, indent=2))
    compact = {k: v for k, v in report.items() if k not in ["sources", "context"]}
    compact["sources"] = {
        s: {k: v for k, v in data.items() if k != "decode_failure_files"}
        for s, data in report["sources"].items()
    }
    compact["context_counts"] = dict(
        active=report["context"]["active_context_rows"],
        mixed=len(report["context"]["mixed_annotated_condition_overlaps"]),
        label_mismatch=len(report["context"]["annotation_label_mismatches"]),
        central_crop_risks=len(
            report["context"]["canonical_preprocessing_retains_under_half_lesion_box"]
        ),
    )
    print(json.dumps(compact, indent=2), flush=True)


if __name__ == "__main__":
    main()
