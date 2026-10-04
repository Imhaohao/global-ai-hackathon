import io
import json
from pathlib import Path
from PIL import Image
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parent


def expand_box(box, width, height, factor):
    x1, y1, x2, y2 = box
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    w, h = (x2 - x1) * factor, (y2 - y1) * factor
    return (
        max(0, cx - w / 2),
        max(0, cy - h / 2),
        min(width, cx + w / 2),
        min(height, cy + h / 2),
    )


def rocole_context():
    mapping = {}
    for file in sorted((ROOT / "data/rocole/data").glob("*.parquet")):
        for batch in pq.ParquetFile(file).iter_batches(batch_size=32):
            for row in batch.to_pylist():
                if len(set(row["objects"]["categories"])) != 1:
                    continue
                image = Image.open(io.BytesIO(row["image"]["bytes"])).convert("RGB")
                name = Path(row["image"]["path"]).stem
                x, y, w, h = row["objects"]["bbox"][0]
                box = expand_box((x, y, x + w, y + h), image.width, image.height, 1.6)
                target = ROOT / "data/scale_context/rocole" / f"{name}.jpg"
                target.parent.mkdir(parents=True, exist_ok=True)
                image = image.crop(box)
                image.thumbnail((1024, 1024))
                image.save(target, quality=95)
                mapping[f"data/images/rocole/{name}.jpg"] = target.relative_to(
                    ROOT
                ).as_posix()
    return mapping


def coffee_context():
    base = ROOT / "data/coffeeleaf_co/extracted/CoffeeLeaf-CO-v2"
    mapping = {}
    for path in sorted((base / "images").rglob("*.jpg")):
        annotations = [
            list(map(float, line.split()))
            for line in (base / "labels" / path.parent.name / (path.stem + ".txt"))
            .read_text()
            .splitlines()
        ]
        if not annotations:
            continue
        with Image.open(path) as source:
            image = source.convert("RGB")
            boxes = [
                (
                    cat,
                    (
                        (cx - w / 2) * image.width,
                        (cy - h / 2) * image.height,
                        (cx + w / 2) * image.width,
                        (cy + h / 2) * image.height,
                    ),
                )
                for cat, cx, cy, w, h in annotations
            ]
            for index, (cat, box) in enumerate(boxes):
                original = f"data/images/coffeeleaf_co/{path.stem}_{index}.jpg"
                if not (ROOT / original).exists():
                    continue
                expanded = expand_box(box, image.width, image.height, 2.5)
                overlap = False
                for other, region in boxes:
                    intersection = max(
                        0, min(expanded[2], region[2]) - max(expanded[0], region[0])
                    ) * max(
                        0, min(expanded[3], region[3]) - max(expanded[1], region[1])
                    )
                    if other != cat and intersection > 0:
                        overlap = True
                        break
                if overlap:
                    continue
                target = (
                    ROOT
                    / "data/scale_context/coffeeleaf_co"
                    / f"{path.stem}_{index}.jpg"
                )
                target.parent.mkdir(parents=True, exist_ok=True)
                crop = image.crop(expanded)
                crop.thumbnail((768, 768))
                crop.save(target, quality=95)
                mapping[original] = target.relative_to(ROOT).as_posix()
    return mapping


if __name__ == "__main__":
    mapping = rocole_context()
    mapping.update(coffee_context())
    (ROOT / "data/scale_context/map.json").write_text(json.dumps(mapping, indent=2))
    print("Context views", len(mapping), flush=True)
