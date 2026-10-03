import concurrent.futures
import json
import urllib.request
from download_sources import fetch, ROOT

rid = "cchery2001/pg26038-coffee-leaf-samples"
rev = "5272a2ab0a7de6c247fe2530ddb0c7f0c74e66f9"
meta = json.load(urllib.request.urlopen("https://huggingface.co/api/datasets/" + rid))
files = [
    f["rfilename"]
    for f in meta["siblings"]
    if f["rfilename"].endswith((".png", ".csv", ".md"))
]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(
        pool.map(
            lambda f: fetch(
                f"https://huggingface.co/datasets/{rid}/resolve/{rev}/{f}",
                ROOT / "data/scans" / f,
            ),
            files,
        )
    )
