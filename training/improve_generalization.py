import copy
import json
from collections import Counter
import numpy as np
import torch
from safetensors.torch import save_file
from sklearn.metrics import f1_score
from model_utils import ROOT, SEED, initialize_runtime, load_model, read_records
from finetune import predict

RUN = ROOT / "runs/efficientnet"


def balanced_score(probabilities, labels, records):
    prediction = probabilities.argmax(1)
    scores = {}
    for source in sorted({r["source"] for r in records}):
        mask = np.array([r["source"] == source for r in records])
        scores[source] = float(
            f1_score(
                labels[mask],
                prediction[mask],
                labels=np.unique(labels[mask]),
                average="macro",
                zero_division=0,
            )
        )
    return float(np.mean(list(scores.values()))), scores


def main():
    initialize_runtime()
    torch.manual_seed(SEED)
    records = read_records()
    cache = torch.load(RUN / "features.pt", weights_only=True)
    features, y = cache["features"], cache["labels"]
    train = torch.tensor([i for i, r in enumerate(records) if r["split"] == "train"])
    val = torch.tensor([i for i, r in enumerate(records) if r["split"] == "val"])
    valrows = [records[int(i)] for i in val]
    model = load_model()
    original = copy.deepcopy(model.classifier).eval()
    source_counts = Counter(records[int(i)]["source"] for i in train)
    class_counts = Counter(records[int(i)]["label"] for i in train)
    sample_weights = torch.tensor(
        [
            1
            / np.sqrt(
                source_counts[records[int(i)]["source"]]
                * class_counts[records[int(i)]["label"]]
            )
            for i in train
        ],
        dtype=torch.float32,
    )
    sample_weights /= sample_weights.mean()
    optimizer = torch.optim.AdamW(
        model.classifier.parameters(), lr=8e-4, weight_decay=0.01
    )
    with torch.no_grad():
        teacher = original(features[train])[:, :5].softmax(1)
    best_score = -1
    best = None
    history = []
    for epoch in range(35):
        order = torch.randperm(len(train))
        for selection in order.split(128):
            index = train[selection]
            logits = model.classifier(features[index])
            loss = torch.nn.functional.cross_entropy(
                logits, y[index], reduction="none", label_smoothing=0.05
            )
            mask = y[index] < 5
            distillation = (
                torch.nn.functional.kl_div(
                    logits[mask, :5].log_softmax(1),
                    teacher[selection][mask],
                    reduction="batchmean",
                )
                if mask.any()
                else logits.sum() * 0
            )
            total = (loss * sample_weights[selection]).mean() + 0.3 * distillation
            optimizer.zero_grad()
            total.backward()
            optimizer.step()
        with torch.no_grad():
            probabilities = model.classifier(features[val]).softmax(1).numpy()
        score, per_source = balanced_score(probabilities, y[val].numpy(), valrows)
        history.append(
            {"epoch": epoch + 1, "val_source_macro_f1": score, "per_source": per_source}
        )
        if score > best_score:
            best_score = score
            best = copy.deepcopy(model.state_dict())
    model.load_state_dict(best)
    save_file(
        {k: v.contiguous() for k, v in model.state_dict().items()},
        str(RUN / "source_balanced.safetensors"),
    )
    incumbent = load_model(RUN / "best.safetensors").eval()
    incumbent_logits, val_y = predict(incumbent, valrows)
    old_score, old_sources = balanced_score(
        incumbent_logits.softmax(1).numpy(), val_y.numpy(), valrows
    )
    selected = "source_balanced" if best_score > old_score else "partial_backbone"
    report = {
        "criterion": "mean per-source macro F1 on validation only",
        "source_balanced_score": best_score,
        "partial_backbone_score": old_score,
        "partial_per_source": old_sources,
        "selected": selected,
        "history": history,
        "teacher_weight": 0.3,
        "epochs": 35,
        "external_multispec_status": "development stress test after first failure; never used for checkpoint selection",
    }
    if selected == "source_balanced":
        save_file(
            {k: v.contiguous() for k, v in incumbent.state_dict().items()},
            str(RUN / "partial_backbone.safetensors"),
        )
        save_file(
            {k: v.contiguous() for k, v in model.state_dict().items()},
            str(RUN / "best.safetensors"),
        )
    (RUN / "improvement_attempt.json").write_text(json.dumps(report, indent=2))
    print(
        json.dumps({k: v for k, v in report.items() if k != "history"}, indent=2),
        flush=True,
    )


if __name__ == "__main__":
    main()
