"""Add reviewed BRACOL lesion annotations, inheriting existing parent splits."""

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

from audit_scale_labels import intersection
from model_utils import ROOT
from prepare_data import image_record
from prepare_scale_context import expand_box

BASE = (
    ROOT / "data/new_sources/bracol_expert/BRACOL_REVIEWED_ANNOTATIONS/BRACOL_REVIEWED"
)
NAMES = ["cercospora", "miner", "phoma", "rust"]


def read_boxes(path, width, height):
    values = [list(map(float, line.split())) for line in path.read_text().splitlines()]
    boxes = []
    for cat, cx, cy, w, h in values:
        assert (
            cat in range(4)
            and 0 < w <= 1
            and 0 < h <= 1
            and 0 <= cx <= 1
            and 0 <= cy <= 1
        )
        boxes.append(
            (
                int(cat),
                (
                    max(0, (cx - w / 2) * width),
                    max(0, (cy - h / 2) * height),
                    min(width, (cx + w / 2) * width),
                    min(height, (cy + h / 2) * height),
                ),
            )
        )
    return boxes


def crops(path, parent, excluded):
    result = []
    label_path = path.parent.parent / "labels" / (path.stem + ".txt")
    with Image.open(path) as original:
        image = original.convert("RGB")
    boxes = read_boxes(label_path, image.width, image.height)
    if not boxes:
        excluded["empty_annotations_not_healthy"] += 1
    for index, (category, box) in enumerate(boxes):
        region = expand_box(box, image.width, image.height, 1.1)
        if min(region[2] - region[0], region[3] - region[1]) < 12:
            excluded["tiny_target"] += 1
            continue
        if any(
            other != category and intersection(region, target) > 0
            for other, target in boxes
        ):
            excluded["mixed_condition_overlap"] += 1
            continue
        target = (
            ROOT
            / "data/images/bracol_expert"
            / f"{path.name.split('_')[0]}_{index}.jpg"
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        crop = image.crop(region)
        crop.thumbnail((768, 768))
        crop.save(target, quality=95)
        row = image_record(
            target, NAMES[category], "bracol_expert", parent["parent"], parent["split"]
        )
        row.update(
            group=parent["group"],
            pretraining_exposed=parent.get("pretraining_exposed", False),
            original_path=path.relative_to(ROOT).as_posix(),
            original_annotation=label_path.relative_to(ROOT).as_posix(),
            annotation_index=index,
            source_label=NAMES[category],
            source_category=category,
            bbox_xyxy=box,
            label_origin="Published plant-pathologist-reviewed BRACOL annotation; not independently re-diagnosed here.",
        )
        result.append(row)
    return result


def main():
    manifest = ROOT / "data/scale_v2_manifest.json"
    before = hashlib.sha256(manifest.read_bytes()).hexdigest()
    rows = json.loads(manifest.read_text())["images"]
    parents = {}
    for row in rows:
        if row["source"].startswith("bracol"):
            if row["parent"] in parents:
                assert (row["group"], row["split"]) == (
                    parents[row["parent"]]["group"],
                    parents[row["parent"]]["split"],
                )
            parents[row["parent"]] = row
    excluded = Counter()
    new = []
    for path in sorted(BASE.rglob("*.jpg")):
        parent = parents.get("bracol:" + path.name.split("_")[0])
        if parent is None:
            excluded["unknown_parent_excluded"] += 1
            continue
        new.extend(crops(path, parent, excluded))
    by_hash = defaultdict(list)
    for row in rows:
        by_hash[row["sha256"]].append(row)
    accepted = []
    for row in new:
        matches = by_hash.get(row["sha256"], [])
        if matches:
            excluded["exact_duplicate_crop"] += 1
            continue
        accepted.append(row)
        by_hash[row["sha256"]].append(row)
    report = dict(
        base_manifest_sha256=before,
        base_manifest_unchanged=True,
        raw_new_crops=len(new),
        accepted_crops=len(accepted),
        excluded=dict(excluded),
        counts=[
            dict(label=l, split=s, n=n)
            for (l, s), n in sorted(
                Counter((r["label"], r["split"]) for r in accepted).items()
            )
        ],
        limitations=[
            "These are reviewed annotations on existing BRACOL photographs, not new independent plants.",
            "Existing parent groups and splits are inherited exactly; unknown parents are excluded.",
            "No empty annotations are interpreted as healthy; overlapping different-class targets are excluded.",
            "Near duplicates across parents remain bounded by the original grouped manifest; this is not proof of physical leaf identity.",
        ],
    )
    assert before == hashlib.sha256(manifest.read_bytes()).hexdigest()
    out = ROOT / "data/scale_v3_manifest.json"
    out.write_text(json.dumps(dict(images=rows + accepted, report=report), indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
