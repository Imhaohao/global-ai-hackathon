"""Downloads the licensed Wikimedia Commons photos the reel uses, resized to 2400 px wide JPEGs in public/images,
and writes their author and licence to src/reels/demo/photoCredits.json for the end card.

  python3 scripts/fetchPhotos.py
"""

import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

REELS = Path(__file__).resolve().parents[1]
OUT = REELS / "public" / "images"
CREDITS = REELS / "src" / "reels" / "demo" / "photoCredits.json"
HEADERS = {"User-Agent": "LeafDoctorReel/0.1 (https://github.com/Imzihao; hackathon demo reel) python-urllib"}

PHOTOS = {
    "rust-underside": "File:Hemileia vastatrix - coffee leaf rust.jpg",
    "rust-kiambu": "File:Coffee leaves with rust at Fairview Estate, Kiambu, KE.jpg",
    "rust-topside": "File:Hemileia vastatrix.jpg",
}


def get(url: str) -> bytes:
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=90) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429:
                raise
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Rate limited: {url}")


def plain(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def info(title: str) -> dict:
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": title, "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": 2400,
    })
    page = next(iter(json.loads(get(f"https://commons.wikimedia.org/w/api.php?{query}"))["query"]["pages"].values()))
    return page["imageinfo"][0]


def fetch(name: str, title: str) -> dict:
    meta = info(title)
    source = OUT / f"{name}.source"
    source.write_bytes(get(meta["thumburl"]))
    target = OUT / f"{name}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-q:v", "3", str(target)], check=True)
    source.unlink()
    extmeta = meta["extmetadata"]
    return {
        "file": f"images/{name}.jpg",
        "title": title.removeprefix("File:"),
        "author": plain(extmeta.get("Artist", {}).get("value", "")),
        "licence": plain(extmeta.get("LicenseShortName", {}).get("value", "")),
        "source": meta["descriptionurl"],
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    credits = []
    for name, title in PHOTOS.items():
        credits.append(fetch(name, title))
        print("fetched", name)
        time.sleep(4)
    CREDITS.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + "\n")


main()
