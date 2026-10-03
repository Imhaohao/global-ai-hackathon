"""Download and prepare the external RGB rust stress-test collection."""

import json
import pyarrow.parquet as pq
from download_sources import fetch, ROOT


def main():
    base = "https://huggingface.co/datasets/Project-AgML/coffee_rust_multispec_classification/resolve/d3ad329b4be26eea968e6c8e10adf252b960aeb6/"
    for name in ["data/train-00000-of-00001.parquet", "README.md"]:
        fetch(base + name, ROOT / "data/multispec" / name)
    records = []
    parquet = ROOT / "data/multispec/data/train-00000-of-00001.parquet"
    for batch in pq.ParquetFile(parquet).iter_batches(
        batch_size=64, columns=["rgb", "label"]
    ):
        for row in batch.to_pylist():
            path = ROOT / "data/images/multispec_binary" / f"{len(records)}.jpg"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(row["rgb"]["bytes"])
            records.append(
                dict(
                    path=path.relative_to(ROOT).as_posix(),
                    label="rust" if row["label"] == 1 else "not_rust",
                    source="multispec_rgb",
                )
            )
    (ROOT / "data/multispec_binary.json").write_text(json.dumps(records, indent=2))
    print("Prepared external binary RGB examples:", len(records))


if __name__ == "__main__":
    main()
