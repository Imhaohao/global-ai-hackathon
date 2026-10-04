# Global AI Hackathon

Our project for **Hack-Nation's 7th Global AI Hackathon**, a 24-hour hybrid hackathon where AI builders compete, collaborate, and ship.

## About the event

- **Dates:** October 3–4, 2026
- **Format:** 24-hour hybrid build marathon, run online and in person across 14 city hubs worldwide
- **Challenges:** roughly 6–8 AI challenge tracks, announced during the event
- **Prizes:** $35k+ in cash and credits, including $30k+ in cash prizes and API credits across the challenges, plus $200k+ in AI tools and credits for participating teams
- **Venture Track:** the top 1% of teams are invited to the Venture Lab to keep incubating their startups after the event
- **Mentors and judges:** drawn from OpenAI, Meta, Apple, and leading AI startups
- **Who can join:** anyone building with AI, from indie hackers and students to startup teams

## Our project

_To be filled in once the challenge track is chosen._

## Getting started

```bash
git clone https://github.com/Imhaohao/global-ai-hackathon
cd global-ai-hackathon
```

## Sources

- [Global AI Hackathon 7 – Hack-Nation](https://www.createwith.com/event/unknown-global-ai-hackathon-7-hack-nation-oct-2026)
- [Vienna Hub – 7th Hack-Nation Global AI Hackathon](https://luma.com/37954ppi)

## Local coffee-leaf model

See the [model data card](docs/data-card.md) and the [committed recovered evaluation](training/results/final-evaluation.json). That evaluation is marked `not_reproduced`; the historical metrics below are tied to the current artifact and calibration hashes.

The desktop training pipeline starts from `Huyt/arabica-coffee-leaf-disease-efficientnet-b0` at revision `252d26841543befab22880876f8ca91543230aab`. It uses PyTorch/timm on CPU and exports a bundled offline TensorFlow Lite model. The existing `training/train.py` is the separate original MobileNet experiment; use the EfficientNet scripts below for this model.

The current bundled model version is `deployed-v1` with **4,017,796 parameters**. `mobile/assets/model/coffee-leaf.tflite` is **8,091,596 bytes (7.72 MiB)**, with FP16 weight storage and float32 operations/input/output. Its SHA256 is `19b4f9747604dcff2cc43f44e3056f5c4fd827e3b0556e6632e1acbd1ce6ccda`. Desktop CPU inference measured a median of about **51 ms** with four threads; this is not a phone benchmark. The fresh-process verifier blocked outgoing sockets and observed zero attempts. Android/iOS device validation has not been performed.

### Data and training

`training/sources.json` records sources, pinned revisions, licenses, inclusion/exclusion decisions and source/class/split counts. Five training families are used: AGML Arabica, BRACOL, RoCoLe, CoffeeLeaf-CO (including its Silva derivative subset), and Makerere Beans as unsupported non-coffee examples. The preparation retains **23,552 distinct examples**, including evaluation-only material: 14,119 train, 3,921 validation, 4,571 test and 941 external. All training examples contribute to the classifier stage. The last-backbone stage rotates one crop per parent and label each epoch to reduce correlated crop dominance. This is 30 classifier epochs followed by three partial-backbone epochs; validation selected epoch two. A further 35-epoch source-balanced/distilled classifier candidate scored lower on mean per-source validation macro F1 (0.8104 versus 0.8648) and was not selected.

Exact hashes, perceptual hashes, parent images and available plant IDs form 6,174 groups. No group crosses partitions. AGML was used by the original pretrained model; those tests must not be described as entirely unseen. CoffeeLeaf empty annotations are not treated as healthy. Dataset crop counts are not counts of independent plants. The 1,120-image RGB rust collection is a previously inspected development stress test, not training data. Its NoRust class is a binary negative, not a healthy diagnosis. The separate 100-image PG26038 set contains flatbed scans of 50 paired leaves; Mycena citricolor is unsupported, not cercospora. Both external collections were audited for exact and near matches to train/validation and known pretraining-exposed groups, with no matches found.

AGML provenance includes field-origin digital-camera images from one plantation in Mutira, Kirinyaga County, Kenya. Those images are pretraining-exposed source material, not prospective Kenyan-farm validation; independent smartphone validation remains outstanding.

### Results and limits

The recovered historical report for the deployed FP16 runtime scored **91.05% raw accuracy** across the 4,571 internal test images. Its frozen per-class confidence and image-quality rules accepted **81.49%**; **93.10%** of accepted predictions were correct. On sources new to fine-tuning, raw accuracy was **89.53%**, accepted coverage was **74.25%**, and accepted accuracy was **91.57%**; cercospora precision was **50.00%**. All 128 held-out bean images were rejected. These are dataset results, not established field accuracy.

External results remain poor: the rust development collection scored **AUROC 0.491**, rust recall **52.66%** and specificity **43.59%** at its own validation-selected binary threshold. The original model's AUROC was 0.420. All 100 untouched external scans were rejected; raw supported-class accuracy was 20%. Synthetic severe blur was rejected only 28.7% of the time, although severe darkness was always rejected in the 223-image quality check. This model is a research prototype and needs representative phone-camera validation before field reliance.

Output order is `cercospora, healthy, miner, phoma, rust, red_spider_mite, weevil_damage, unsupported`. Mite predictions are disabled because validation evidence was insufficient; the unsupported class is always rejected. Weevil means possible chewing damage, not confirmed insect identification. Scores are model scores, not probabilities of a confirmed diagnosis. The JSON beside the model supplies the final thresholds. They were chosen on deployed-runtime validation predictions, never on the final photo sample.

The current checkout predates the planned 4 October 2026 noon freeze. No new candidate was evaluated or rerun here. With a local photo, the committed artifact-only check is:

```sh
training/.venv/bin/python training/verify_offline.py --artifact-only --photo /path/to/photo.jpg
```

It checks the artifact and config hashes, the input/output signature, normalized softmax, internal operations, FP16 storage, quality gate, and blocked network calls. It does not require the missing training checkpoint.

Across all 4,571 test images, FP16 and Python differed on seven top labels, nine accept/reject decisions and 15 confidence states. Maximum score difference was 0.0303. The deployed runtime determines app decisions. Before inference, resize the shortest side to 256 and center-crop 224; supply float32 RGB in 0..255 with shape `[1,224,224,3]`. Normalization and calibrated softmax are inside the graph. Desktop evaluation uses bicubic resize; native phone interpolation and JPEG encoding still require device-level verification.

### Reproduce on Windows

Python 3.12 is used. Install CPU PyTorch from its official index, then the locked environment:

```powershell
python -m venv training/.venv
training/.venv/Scripts/python.exe -m pip install torch==2.14.1+cpu torchvision==0.29.1+cpu --index-url https://download.pytorch.org/whl/cpu
training/.venv/Scripts/python.exe -m pip install -r training/requirements-efficientnet-lock.txt
training/.venv/Scripts/python.exe training/download_sources.py
training/.venv/Scripts/python.exe training/download_extra.py
training/.venv/Scripts/python.exe training/download_co.py
training/.venv/Scripts/python.exe training/download_field.py
training/.venv/Scripts/python.exe training/download_scans.py
training/.venv/Scripts/python.exe training/prepare_data.py
training/.venv/Scripts/python.exe training/finetune.py --epochs 3
training/.venv/Scripts/python.exe training/calibrate_rejection.py
training/.venv/Scripts/python.exe training/export_mobile.py --publish
training/.venv/Scripts/python.exe training/final_evaluation.py
training/.venv/Scripts/python.exe training/verify_offline.py
```

Keep seed 42, the pinned downloads and `data/manifest.json` with the run. Feature caches validate the manifest, actual image contents, preprocessing and model state. Training and candidate selection must happen before calibration/export; repeat those downstream stages whenever selecting a new checkpoint. `training/improve_generalization.py` reproduces the optional source-balanced comparison. Hardware/library changes can alter numerical results.

For a single local photo, run `training/.venv/Scripts/python.exe training/infer.py C:/path/to/leaf.jpg`. The selected checkpoint, histories and full frozen-gate evaluation live under `training/runs/efficientnet/`. `training/evaluate_photos.py --output C:/path/to/evaluation` produces a reproducible 20-image internal photo review plus separate external examples after training; it asserts that model and app artifacts stay unchanged. Large data, environments, caches and research checkpoints are ignored by Git. The deployable model remains at the application's existing tracked asset path.
