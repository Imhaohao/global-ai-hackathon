"""Fetch the pinned CoffeeLeaf-CO archive and verify before extraction."""

import hashlib
import json
import urllib.request
import zipfile
from download_sources import fetch, ROOT


def main():
    base = ROOT / "data/coffeeleaf_co"
    base.mkdir(parents=True, exist_ok=True)
    metadata = json.load(
        urllib.request.urlopen("https://zenodo.org/api/records/22756170")
    )
    (base / "record.json").write_text(json.dumps(metadata, indent=2))
    entry = next(f for f in metadata["files"] if f["key"] == "CoffeeLeaf-CO-v2.zip")
    archive = base / entry["key"]
    fetch(entry["links"]["self"], archive)
    assert (
        hashlib.md5(archive.read_bytes()).hexdigest()
        == "2ba46bd8f7a23708d982ff578760f1fa"
    )
    destination = (base / "extracted").resolve()
    with zipfile.ZipFile(archive) as bundle:
        for info in bundle.infolist():
            target = (destination / info.filename).resolve()
            target.relative_to(destination)
            if not info.is_dir():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(bundle.read(info))
    print("Verified and extracted CoffeeLeaf-CO v2")


if __name__ == "__main__":
    main()
