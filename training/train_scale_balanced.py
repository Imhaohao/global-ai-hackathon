"""Conservative follow-up: preserve target regions and replay weak classes."""

import random
from collections import defaultdict

import numpy as np
from PIL import Image, ImageOps

from model_utils import ROOT, LABELS
from train_scale import OLD_SOURCES, SEED, ScaleDataset, eligible, main, scale_view


class BalancedScaleDataset(ScaleDataset):
    def __getitem__(self, index):
        row = self.records[index]
        canonical = random.random() < 0.70
        path = row["path"] if canonical else row.get("context_path", row["path"])
        with Image.open(ROOT / path) as original:
            image = original.convert("RGB")
        if random.random() < 0.5:
            image = ImageOps.mirror(image)
        if random.random() < 0.3:
            image = ImageOps.flip(image)
        image = self.jitter(image)
        if canonical:
            tensor = self.canonical(image)
        else:
            tensor = self.normalize(scale_view(image, random.uniform(0.65, 1)))
        return tensor, LABELS.index(row["label"]), row["source"] in OLD_SOURCES


def sampled_rows(records, epoch):
    groups = defaultdict(list)
    for row in records:
        if row["split"] == "train":
            groups[(row["source"], row["group"], row["label"])].append(row)
    rng = np.random.default_rng(SEED + epoch)
    result = []
    for (source, _, label), rows in sorted(groups.items()):
        limit = (
            4
            if source == "peru" or label == "red_spider_mite"
            else 2
            if label in ["cercospora", "healthy"]
            else 1
        )
        result.extend(
            rows[int(i)]
            for i in rng.choice(len(rows), min(limit, len(rows)), replace=False)
        )
    return result


def qualifies(metrics, baseline):
    preserve_each = all(
        metrics["old_class_f1"][label] >= baseline["old_class_f1"][label] - 0.01
        for label in ["cercospora", "healthy", "red_spider_mite"]
    )
    return eligible(metrics, baseline) and preserve_each


if __name__ == "__main__":
    main(
        dict(
            run=ROOT / "runs/scale_v3",
            manifest=ROOT / "data/scale_v3_manifest.json",
            sampler=sampled_rows,
            dataset_class=BalancedScaleDataset,
            qualify=qualifies,
            learning_rate=3e-6,
            max_epochs=4,
            teacher_weight=0.4,
            description="70% original canonical replay; 30% full-target scale views (65-100% canvas), including annotated context. More distinct training views per weak-class group. Reviewed BRACOL annotations inherit existing parent splits. Require <=1pp regression individually for cercospora, healthy and mites, in addition to existing selection gates. Start from published incumbent; no scale_v2 weights reused.",
        )
    )
