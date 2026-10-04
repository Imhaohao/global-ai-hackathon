"""Score any model on the 1,119-image external rust set, so model comparisons share one scorer.

Run a bundled app model end to end:
    training/.venv/bin/python training/benchmark_external_rust.py --model b2

Score another model's outputs (one row per image, columns path,rust_score):
    training/.venv/bin/python training/benchmark_external_rust.py --scores astra.csv --name gpt-6-astra --seconds 3519
"""

import argparse
import csv
import json
import time
from pathlib import Path

import numpy as np
from sklearn.metrics import roc_auc_score

from compare_model_runtime import ROOT, image_input, interpreter_for, read_json, sha

RUST_INDEX = 4
ASSETS = ROOT.parent / "mobile/assets/model"
ARTIFACTS = {
    "b0": ASSETS / "coffee-leaf.tflite",
    "b1": ASSETS / "coffee-leaf-b1.tflite",
    "b2": ASSETS / "coffee-leaf-b2.tflite",
}
COMPARISON = ROOT / "reports/model_comparison_b3/comparison.json"
OUTPUT = ROOT / "reports/external_rust_benchmark"


def external_rust_rows():
    excluded = {
        item["path"]
        for item in read_json(COMPARISON)["external_rust_audit"]["exclusions"]
    }
    rows = [
        row
        for row in read_json(ROOT / "data/multispec_binary.json")
        if row["path"] not in excluded
    ]
    assert len(rows) == 1119, f"expected 1,119 retained images, found {len(rows)}"
    return rows


def run_bundled_model(model, rows, threads):
    artifact = ARTIFACTS[model]
    interpreter, inp, out = interpreter_for(artifact, threads)
    scores = []
    start = time.perf_counter()
    for row in rows:
        interpreter.set_tensor(inp, image_input(row, "canonical"))
        interpreter.invoke()
        scores.append(float(interpreter.get_tensor(out)[0][RUST_INDEX]))
    seconds = time.perf_counter() - start
    return dict(zip((row["path"] for row in rows), scores)), seconds, sha(artifact)


def read_scores(path, rows):
    with open(path, newline="") as handle:
        scores = {row["path"]: float(row["rust_score"]) for row in csv.DictReader(handle)}
    missing = [row["path"] for row in rows if row["path"] not in scores]
    if missing:
        raise SystemExit(f"{len(missing)} images have no score, first: {missing[0]}")
    return scores


def write_scores(path, rows, scores):
    with open(path, "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["path", "label", "rust_score"])
        for row in rows:
            writer.writerow([row["path"], row["label"], scores[row["path"]]])


def summarize(name, rows, scores, seconds, artifact_sha):
    truth = np.array([row["label"] == "rust" for row in rows], dtype=int)
    ranked = np.array([scores[row["path"]] for row in rows])
    return {
        "model": name,
        "images": len(rows),
        "rust_images": int(truth.sum()),
        "not_rust_images": int(len(truth) - truth.sum()),
        "auroc": round(float(roc_auc_score(truth, ranked)), 4),
        "wall_clock_seconds": None if seconds is None else round(seconds, 1),
        "artifact_sha256": artifact_sha,
        "label_file_sha256": sha(ROOT / "data/multispec_binary.json"),
        "note": "AUROC ranks Rust above NoRust; it is not diagnosis accuracy at the app's threshold.",
    }


def main():
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--model", choices=sorted(ARTIFACTS))
    source.add_argument("--scores", type=Path)
    parser.add_argument("--name", help="report name when scoring an outside model's CSV")
    parser.add_argument("--seconds", type=float, help="measured wall-clock run time for --scores")
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()

    rows = external_rust_rows()
    if args.model:
        name = args.model
        scores, seconds, artifact_sha = run_bundled_model(args.model, rows, args.threads)
    else:
        name = args.name or args.scores.stem
        scores, seconds, artifact_sha = read_scores(args.scores, rows), args.seconds, sha(args.scores)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_scores(OUTPUT / f"{name}_scores.csv", rows, scores)
    report = summarize(name, rows, scores, seconds, artifact_sha)
    (OUTPUT / f"{name}.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
