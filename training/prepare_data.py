import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from pathlib import Path

import imagehash
import numpy as np
import pyarrow.parquet as pq
from PIL import Image

from model_utils import ROOT, SOURCE_TO_APP


class Groups:
    def __init__(self, count):
        self.parents = list(range(count))

    def root(self, index):
        while self.parents[index] != index:
            self.parents[index] = self.parents[self.parents[index]]
            index = self.parents[index]
        return index

    def join(self, first, second):
        self.parents[self.root(second)] = self.root(first)


def image_record(path, label, source, parent, split="train"):
    raw = path.read_bytes()
    with Image.open(io.BytesIO(raw)) as image:
        perceptual = int(str(imagehash.phash(image)), 16)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "label": label,
        "source": source,
        "parent": parent,
        "split": split,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "phash": perceptual,
    }


def extract_agml():
    published = json.loads((ROOT / "models/huyt/coffee_split_honest.json").read_text())
    members = {
        published["rows"][index]: (part, published["groups"][index])
        for part in ["train", "val", "test"]
        for index in published[part]
    }
    offset, records = 0, []
    for path in sorted((ROOT / "data/agml/data").glob("*.parquet")):
        parquet = pq.ParquetFile(path)
        features = json.loads(parquet.schema_arrow.metadata[b"huggingface"])["info"][
            "features"
        ]
        names = features["label"]["names"]
        for batch in parquet.iter_batches(batch_size=512):
            for row in batch.to_pylist():
                membership = members.get(offset)
                if membership:
                    split, group = membership
                    target = ROOT / "data/images/agml" / f"{offset}.jpg"
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(row["image"]["bytes"])
                    records.append(
                        image_record(
                            target,
                            SOURCE_TO_APP[names[row["label"]]],
                            "agml",
                            f"agml:{group}",
                            split,
                        )
                    )
                offset += 1
        print("AGML extracted", offset, len(records), flush=True)
    if offset != 58549 or len(records) != 3756:
        raise ValueError(
            f"Incomplete source extraction: rows={offset}, unique={len(records)}"
        )
    return records


def extract_bracol():
    base = ROOT / "data/bracol/classification/dataset"
    mapping = {0: "healthy", 1: "miner", 2: "rust", 3: "phoma", 4: "cercospora"}
    records = []
    for row in csv.DictReader((base / "dataset-full.csv").open()):
        label = int(row["predominant_stress"])
        multiple = (
            sum(int(row[name]) for name in ["miner", "rust", "phoma", "cercospora"]) > 1
        )
        path = base / "leaf" / (row["id"] + ".jpg")
        if label not in mapping or multiple or not path.exists():
            continue
        records.append(
            image_record(path, mapping[label], "bracol_leaf", "bracol:" + row["id"])
        )
    names = {
        "1_health": "healthy",
        "2_miner": "miner",
        "3_rust": "rust",
        "4_phoma": "phoma",
        "5_cercospora": "cercospora",
    }
    for path in sorted((base / "symptom").rglob("*.jpg")):
        if path.parent.name not in names:
            continue
        if not path.stem.split("_")[0].isdigit():
            continue
        records.append(
            image_record(
                path,
                names[path.parent.name],
                "bracol_symptom",
                "bracol:" + path.stem.split("_")[0],
            )
        )
    print("BRACOL records", len(records), flush=True)
    return records


def extract_rocole():
    records = []
    for file in sorted((ROOT / "data/rocole/data").glob("*.parquet")):
        for batch in pq.ParquetFile(file).iter_batches(batch_size=64):
            for row in batch.to_pylist():
                categories = row["objects"]["categories"]
                if len(set(categories)) != 1:
                    continue
                category = categories[0]
                label = {0: "healthy", 1: "red_spider_mite"}.get(category, "rust")
                image = Image.open(io.BytesIO(row["image"]["bytes"])).convert("RGB")
                name = Path(row["image"].get("path") or f"row{len(records)}").stem
                box = row["objects"]["bbox"][0]
                x, y, w, h = box
                if max(box) <= 1:
                    x, w = x * image.width, w * image.width
                    y, h = y * image.height, h * image.height
                cropped = image.crop(
                    (
                        max(0, x),
                        max(0, y),
                        min(image.width, x + w),
                        min(image.height, y + h),
                    )
                )
                target = ROOT / "data/images/rocole" / (name + ".jpg")
                target.parent.mkdir(parents=True, exist_ok=True)
                cropped.save(target, quality=95)
                parent = name.split("E")[0].split("H")[0]
                records.append(
                    image_record(target, label, "rocole", "rocole:" + parent)
                )
    print("RoCoLe records", len(records), flush=True)
    return records


def extract_beans():
    records = []
    for path in sorted((ROOT / "data/beans/data").glob("*.parquet")):
        part = {"train": "train", "validation": "val", "test": "test"}[
            path.stem.split("-")[0]
        ]
        for batch in pq.ParquetFile(path).iter_batches(batch_size=128):
            for row in batch.to_pylist():
                name = Path(row["image_file_path"]).name
                target = ROOT / "data/images/beans" / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(row["image"]["bytes"])
                records.append(
                    image_record(target, "unsupported", "beans", "beans:" + name, part)
                )
    return records


def extract_coffeeleaf():
    base = ROOT / "data/coffeeleaf_co/extracted/CoffeeLeaf-CO-v2"
    provenance = {
        row["filename"]: row
        for row in csv.DictReader((base / "provenance_manifest.csv").open())
    }
    records = []
    names = {0: "rust", 1: "weevil_damage", 2: "miner"}
    for path in sorted((base / "images").rglob("*.jpg")):
        label_path = base / "labels" / path.parent.name / (path.stem + ".txt")
        annotations = label_path.read_text().strip().splitlines()
        metadata = provenance[path.name]
        if not annotations:
            continue
        with Image.open(path) as image:
            image = image.convert("RGB")
            for index, line in enumerate(annotations):
                category, cx, cy, width, height = map(float, line.split())
                box = (
                    (cx - width / 2) * image.width,
                    (cy - height / 2) * image.height,
                    (cx + width / 2) * image.width,
                    (cy + height / 2) * image.height,
                )
                crop = image.crop(box)
                if min(crop.size) < 16:
                    continue
                target = ROOT / "data/images/coffeeleaf_co" / f"{path.stem}_{index}.jpg"
                target.parent.mkdir(parents=True, exist_ok=True)
                crop.save(target, quality=95)
                record = image_record(
                    target,
                    names[int(category)],
                    "coffeeleaf_" + metadata["inferred_source"],
                    "coffeeleaf:" + path.stem,
                    path.parent.name,
                )
                records.append(record)
    print("CoffeeLeaf annotated crops", len(records), flush=True)
    return records


def extract_multispec():
    records = []
    for file in (ROOT / "data/multispec/data").glob("*.parquet"):
        for batch in pq.ParquetFile(file).iter_batches(
            batch_size=64, columns=["rgb", "label"]
        ):
            for row in batch.to_pylist():
                if row["label"] != 1:
                    continue
                target = ROOT / "data/images/multispec" / f"{len(records)}.jpg"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(row["rgb"]["bytes"])
                records.append(
                    image_record(
                        target,
                        "rust",
                        "multispec_external",
                        "multispec:" + target.stem,
                        "external",
                    )
                )
    print("Multispec RGB rust-only independent evaluation", len(records), flush=True)
    return records


def assign_random_groups(records):
    rng = np.random.default_rng(42)
    group_labels = defaultdict(list)
    for record in records:
        if record["source"] in ["bracol_leaf", "bracol_symptom", "rocole"]:
            group_labels[record["parent"]].append(record["label"])
    by_label = defaultdict(list)
    for group, labels in group_labels.items():
        by_label[Counter(labels).most_common(1)[0][0]].append(group)
    parts = {}
    for groups in by_label.values():
        groups = sorted(groups)
        rng.shuffle(groups)
        for index, group in enumerate(groups):
            fraction = index / len(groups)
            parts[group] = (
                "test" if fraction < 0.15 else "val" if fraction < 0.30 else "train"
            )
    for record in records:
        record["split"] = parts.get(record["parent"], record["split"])


def audit_groups(records):
    groups = Groups(len(records))
    by_parent, exact = {}, {}
    hashes = []
    for index, record in enumerate(records):
        for table, key in [(by_parent, record["parent"]), (exact, record["sha256"])]:
            if key in table:
                groups.join(index, table[key])
            else:
                table[key] = index
        hashes.append(record["phash"])
    for i, first in enumerate(hashes):
        for j in range(i):
            if (first ^ hashes[j]).bit_count() <= 5:
                groups.join(i, j)
    priority = {"train": 0, "val": 1, "test": 2, "external": 3}
    partitions = defaultdict(list)
    for index, record in enumerate(records):
        partitions[groups.root(index)].append(record)
    for group, members in partitions.items():
        exposed = any(r["source"] == "agml" and r["split"] == "train" for r in members)
        split = max((item["split"] for item in members), key=priority.get)
        for item in members:
            item.update(group=f"g{group}", split=split, pretraining_exposed=exposed)
    unique = {}
    conflicts = set()
    for record in records:
        digest = record["sha256"]
        if digest in unique and unique[digest]["label"] != record["label"]:
            conflicts.add(digest)
        unique.setdefault(digest, record)
    kept = [record for digest, record in unique.items() if digest not in conflicts]
    return kept, {
        "raw_records": len(records),
        "exact_unique": len(unique),
        "conflicting_exact_excluded": len(conflicts),
        "near_duplicate_groups": len(partitions),
        "phash_hamming_limit": 5,
    }


def main():
    records = (
        extract_agml()
        + extract_bracol()
        + extract_rocole()
        + extract_beans()
        + extract_coffeeleaf()
        + extract_multispec()
    )
    assign_random_groups(records)
    records, audit = audit_groups(records)
    counts = Counter((r["source"], r["label"], r["split"]) for r in records)
    manifest = {
        "seed": 42,
        "images": records,
        "audit": audit,
        "counts": [
            {"source": s, "label": label, "split": p, "count": n}
            for (s, label, p), n in sorted(counts.items())
        ],
        "limitations": [
            "AGML is pretraining-source data, not an independent test.",
            "Perceptual hashes are a proxy for unidentified plants; some undetected near-duplicates may remain.",
            "BRACOL mixed-stress whole leaves excluded; symptom crops retain their actual labels.",
        ],
    }
    (ROOT / "data/manifest.json").write_text(json.dumps(manifest, indent=2))
    print(
        json.dumps(
            {"audit": audit, "splits": dict(Counter(r["split"] for r in records))}
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
