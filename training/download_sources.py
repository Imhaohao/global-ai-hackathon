import concurrent.futures
import json
import time
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
MODEL_REV = "252d26841543befab22880876f8ca91543230aab"
DATA_REV = "d7fc77a53d876ab33af0d1dd6f3107999a00b7d6"
BRACOL_REV = "a6c38b693094c2c4da4b82029fc8be7058506a16"
MODEL_ID = "Huyt/arabica-coffee-leaf-disease-efficientnet-b0"
DATA_ID = "Project-AgML/arabica_coffee_leaf_disease_classification"


def fetch(url, dest):
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return
    temporary = dest.with_suffix(dest.suffix + ".partial")
    for attempt in range(5):
        offset = temporary.stat().st_size if temporary.exists() else 0
        headers = {"User-Agent": "LeafDoctor-research/1.0", "Range": f"bytes={offset}-"}
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as response:
                mode = "ab" if response.status == 206 and offset else "wb"
                with temporary.open(mode) as output:
                    while chunk := response.read(65536):
                        output.write(chunk)
            temporary.replace(dest)
            print("Downloaded", dest.name, dest.stat().st_size, flush=True)
            return
        except (TimeoutError, OSError) as error:
            print("Retry", dest.name, str(error), flush=True)
            time.sleep(2)
    raise RuntimeError(f"Download failed after five attempts: {url}")


def main():
    jobs = [
        (
            f"https://huggingface.co/{MODEL_ID}/resolve/{MODEL_REV}/{name}",
            ROOT / "models" / "huyt" / name,
        )
        for name in [
            "config.json",
            "model.safetensors",
            "README.md",
            "coffee_split_honest.json",
            "coffee_groups.json",
        ]
    ]
    jobs += [
        (
            f"https://huggingface.co/datasets/{DATA_ID}/resolve/{DATA_REV}/{name}",
            ROOT / "data" / "agml" / name,
        )
        for name in ["README.md"]
        + [f"data/train-{i:05d}-of-00004.parquet" for i in range(4)]
    ]
    archive = ROOT / "data" / "bracol.zip"
    jobs.append(
        (f"https://codeload.github.com/esgario/lara2018/zip/{BRACOL_REV}", archive)
    )
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        for result in executor.map(lambda job: fetch(*job), jobs):
            pass
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            relative = Path(*Path(info.filename).parts[1:])
            allowed = str(relative).startswith(
                "classification\\dataset"
            ) or relative.name in ["LICENSE", "README.md"]
            if not allowed or info.is_dir():
                continue
            target = (ROOT / "data" / "bracol" / relative).resolve()
            target.relative_to((ROOT / "data" / "bracol").resolve())
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(info))
    revisions = {
        "model": MODEL_REV,
        "agml": DATA_REV,
        "bracol_author_mirror": BRACOL_REV,
    }
    (ROOT / "data" / "revisions.json").write_text(json.dumps(revisions, indent=2))
    print("Sources ready", revisions, flush=True)


if __name__ == "__main__":
    main()
