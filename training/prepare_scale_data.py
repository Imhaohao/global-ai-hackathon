"""Prepare new sources without changing existing partitions."""

import hashlib
import json
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from functools import lru_cache

import imagehash
import numpy as np
from PIL import Image, ImageOps
from model_utils import ROOT, read_records
from prepare_data import Groups

DATA = ROOT / "data/new_sources"
MAP = {
    "Health leaves": "healthy",
    "leaf rust": "rust",
    "phoma": "phoma",
    "Ojo_Gallo": "unsupported",
    "Roya": "rust",
    "Sanas": "healthy",
    "Sana": "healthy",
    "Sano": "healthy",
    "Healthy": "healthy",
}


def variants(image):
    image = image.resize((64, 64))
    return [
        int(
            str(imagehash.phash(image.transpose(mode) if mode is not None else image)),
            16,
        )
        for mode in [
            None,
            Image.Transpose.FLIP_LEFT_RIGHT,
            Image.Transpose.FLIP_TOP_BOTTOM,
            Image.Transpose.ROTATE_90,
            Image.Transpose.ROTATE_180,
            Image.Transpose.ROTATE_270,
            Image.Transpose.TRANSPOSE,
            Image.Transpose.TRANSVERSE,
        ]
    ]


def parent_id(path, source, capture_time):
    if source == "uganda":
        return "uganda:" + path.stem
    if capture_time:
        stamp = datetime.strptime(capture_time, "%Y:%m:%d %H:%M:%S")
        return f"peru:{path.parent.name}:{stamp.date()}:{(stamp.hour * 60 + stamp.minute) // 10}"
    if not path.stem[:8].isdigit():
        number = int("".join(c for c in path.stem if c.isdigit()))
        return f"peru:{path.parent.name}:sequence:{number // 20}"
    stamp = datetime.strptime(path.stem[:15], "%Y%m%d_%H%M%S")
    return f"peru:{path.parent.name}:{stamp.date()}:{(stamp.hour * 60 + stamp.minute) // 10}"


def prepare_one(item):
    path, source = item
    try:
        with Image.open(path) as original:
            capture_time = original.getexif().get(306)
            image = ImageOps.exif_transpose(original).convert("RGB")
            image.thumbnail((1024, 1024))
            label = MAP[path.parent.name]
            target = ROOT / "data/images/scale_v2" / source / label / path.name
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, quality=95)
            hashes = variants(image)
        return dict(
            path=target.relative_to(ROOT).as_posix(),
            label=label,
            source=source,
            parent=parent_id(path, source, capture_time),
            sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
            phash=hashes[0],
            variant_hashes=hashes,
            original_path=str(path.relative_to(ROOT)),
            pretraining_exposed=False,
        )
    except (OSError, ValueError, KeyError) as error:
        return dict(excluded=str(path), reason=str(error))


@lru_cache(maxsize=10000)
def small_pixels(path):
    with Image.open(ROOT / path) as image:
        return np.asarray(image.convert("RGB").resize((64, 64)), dtype=np.float32)


def confirmed_match(row, other, hashes, maximum):
    modes = [
        None,
        Image.Transpose.FLIP_LEFT_RIGHT,
        Image.Transpose.FLIP_TOP_BOTTOM,
        Image.Transpose.ROTATE_90,
        Image.Transpose.ROTATE_180,
        Image.Transpose.ROTATE_270,
        Image.Transpose.TRANSPOSE,
        Image.Transpose.TRANSVERSE,
    ]
    distances = np.bitwise_count(hashes ^ np.uint64(other["phash"]))
    candidates = np.flatnonzero(distances <= maximum)
    a = Image.fromarray(small_pixels(row["path"]).astype("uint8"))
    b = small_pixels(other["path"])
    for index in candidates:
        mode = modes[int(index)]
        pixels = np.asarray(
            a.transpose(mode) if mode is not None else a, dtype=np.float32
        )
        foreground = ((pixels.max(2) - pixels.min(2)) > 20) | (
            (b.max(2) - b.min(2)) > 20
        )
        if foreground.sum() < 50:
            continue
        first, second = pixels[foreground].ravel(), b[foreground].ravel()
        correlation = float(np.corrcoef(first, second)[0, 1])
        if correlation >= 0.995:
            return True
    return False


def find_links(index, new, old, references, union, old_matches):
    row = new[index]
    hashes = np.array(row["variant_hashes"], dtype=np.uint64)
    old_distance = np.bitwise_count(hashes[:, None] ^ references[None, :]).min(axis=0)
    for j in np.flatnonzero(old_distance <= 6):
        if confirmed_match(row, old[int(j)], hashes, 6):
            old_matches.add(index)
            break
    if index:
        previous = np.array([r["phash"] for r in new[:index]], dtype=np.uint64)
        distances = np.bitwise_count(hashes[:, None] ^ previous[None, :]).min(axis=0)
        for j in np.flatnonzero(distances <= 8):
            if confirmed_match(row, new[int(j)], hashes, 8):
                union.join(index, int(j))


def duplicate_audit(new, old):
    references = np.array([r["phash"] for r in old], dtype=np.uint64)
    union = Groups(len(new))
    parents = {}
    old_matches = set()
    for i, row in enumerate(new):
        if row["source"] == "peru" and row["parent"] in parents:
            union.join(i, parents[row["parent"]])
        parents[row["parent"]] = i
        find_links(i, new, old, references, union, old_matches)
        if i % 500 == 0:
            print("Verified duplicate audit", i, "/", len(new), flush=True)
    contaminated = {union.root(i) for i in old_matches}
    labels = defaultdict(set)
    for i, row in enumerate(new):
        labels[union.root(i)].add(row["label"])
    conflicts = {g for g, values in labels.items() if len(values) > 1}
    kept = []
    for i, row in enumerate(new):
        group = union.root(i)
        if group in contaminated or group in conflicts:
            continue
        row["group"] = f"scale_v2:{group}"
        kept.append(row)
    return kept, dict(
        raw_new=len(new),
        old_matching_images=len(old_matches),
        old_matches_by_source=dict(Counter(new[i]["source"] for i in old_matches)),
        excluded_new=len(new) - len(kept),
        excluded_groups_overlapping_old=len(contaminated),
        conflicting_label_groups=len(conflicts),
        method="Eight rotation/flip pHash candidates <=6 old or <=8 new; confirm foreground RGB correlation >=0.995. EXIF or filename ten-minute capture blocks; sequence blocks of20 only if no timestamp. Entire Uganda source excluded after overlap review because augmentation parents are unavailable.",
    )


def split_new(records):
    groups = defaultdict(list)
    for row in records:
        groups[row["group"]].append(row)
    by_label = defaultdict(list)
    for group, rows in groups.items():
        if any(r["source"] == "uganda" for r in rows):
            for r in rows:
                r["split"] = "train"
        else:
            by_label[rows[0]["label"]].append(group)
    rng = np.random.default_rng(20261003)
    for label, ids in sorted(by_label.items()):
        rng.shuffle(ids)
        n = len(ids)
        for i, group in enumerate(ids):
            split = (
                "test"
                if i < max(1, round(n * 0.15))
                else "val"
                if i < max(2, round(n * 0.30))
                else "train"
            )
            for r in groups[group]:
                r["split"] = split
    return records


def main():
    old = read_records()
    jobs = [
        (p, source)
        for source in ["uganda", "peru"]
        for p in sorted(
            p
            for p in (DATA / source).rglob("*")
            if p.suffix.lower() in [".jpg", ".jpeg", ".png"]
        )
    ]
    with ThreadPoolExecutor(8) as executor:
        prepared = list(executor.map(prepare_one, jobs))
    invalid = [r for r in prepared if "excluded" in r]
    new, audit = duplicate_audit([r for r in prepared if "excluded" not in r], old)
    quarantined_uganda = sum(r["source"] == "uganda" for r in new)
    new = [r for r in new if r["source"] != "uganda"]
    audit["uganda_quarantined"] = quarantined_uganda
    audit["uganda_reason"] = (
        "Verified transformed overlap with existing images and no recoverable augmentation parent IDs; exclude whole source to avoid unrecognized holdout leakage."
    )
    new = split_new(new)
    contexts = json.loads((ROOT / "data/scale_context/map.json").read_text())
    for r in old:
        if r["path"] in contexts:
            r["context_path"] = contexts[r["path"]]
    counts = Counter((r["source"], r["label"], r["split"]) for r in new)
    report = dict(
        audit=audit,
        invalid=invalid,
        new_counts=[
            dict(source=s, label=label, split=p, n=n)
            for (s, label, p), n in sorted(counts.items())
        ],
        limitations=[
            "Uganda augmentation parent identifiers unavailable and transformed overlap verified: exclude the entire Uganda source from training and evaluation.",
            "Peru has capture timestamps but no plant IDs; ten-minute blocks plus near-duplicate closure are proxies, not guaranteed plant identity.",
            "Existing test/external photos remain out of training; the newly reserved Peru test is not used for selection.",
        ],
    )
    manifest = dict(images=old + new, report=report)
    (ROOT / "data/scale_v2_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(
        json.dumps(
            dict(audit=audit, invalid=len(invalid), new_counts=report["new_counts"]),
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
