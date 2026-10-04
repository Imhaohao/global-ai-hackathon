import concurrent.futures
import urllib.request
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = ROOT / "data/new_sources"
SOURCES = {
    "peru": (
        "https://data.mendeley.com/public-files/datasets/mfpxg4y65r/files/79542fc2-5296-4a2b-a96b-94ce414d55a2/file_downloaded",
        "peru.rar",
    ),
    "uganda": (
        "https://data.mendeley.com/public-api/zip/k36wnd6knb/download/1",
        "uganda.zip",
    ),
    "bracol_expert": (
        "https://www.kaggle.com/api/v1/datasets/download/jonatanfragoso/bracol-for-yolov8-detection",
        "bracol_expert.zip",
    ),
    "xinzhai": (
        "https://zenodo.org/api/records/21442135/files/data.zip/content",
        "xinzhai.zip",
    ),
}


def fetch(item):
    name, (url, file) = item
    destination = BASE / file
    if destination.exists():
        return name, destination.stat().st_size
    temporary = destination.with_suffix(".partial")
    started = time.monotonic()
    for attempt in range(5):
        offset = temporary.stat().st_size if temporary.exists() else 0
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "LeafDoctor dataset research",
                "Range": f"bytes={offset}-",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                mode = "ab" if response.status == 206 and offset else "wb"
                with temporary.open(mode) as stream:
                    while chunk := response.read(1024 * 1024):
                        stream.write(chunk)
                        if time.monotonic() - started > 30:
                            print(
                                name, round(stream.tell() / 1024**2), "MiB", flush=True
                            )
                            started = time.monotonic()
            temporary.replace(destination)
            return name, destination.stat().st_size
        except (OSError, TimeoutError) as e:
            print(name, "retry", str(e), flush=True)
    raise RuntimeError(name + " download failed")


if __name__ == "__main__":
    BASE.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        print(list(pool.map(fetch, SOURCES.items())), flush=True)
