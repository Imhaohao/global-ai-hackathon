from download_sources import fetch, ROOT
import concurrent.futures

sources = {
    "rocole": (
        "Project-AgML/RoCoLe_disease_detection",
        "c33f4617504d1b2ed75b7037dc4860ddc6e4b1f8",
        2,
    ),
    "beans": ("AI-Lab-Makerere/beans", "27aa014ce09b193e1a6f58112d4a66e0eddb69c5", 1),
}
jobs = []
for name, (rid, rev, count) in sources.items():
    files = ["README.md"]
    files += [f"data/train-{i:05d}-of-{count:05d}.parquet" for i in range(count)]
    if name == "beans":
        files += [
            "data/validation-00000-of-00001.parquet",
            "data/test-00000-of-00001.parquet",
        ]
    jobs += [
        (
            f"https://huggingface.co/datasets/{rid}/resolve/{rev}/{file}",
            ROOT / "data" / name / file,
        )
        for file in files
    ]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(lambda j: fetch(*j), jobs))
