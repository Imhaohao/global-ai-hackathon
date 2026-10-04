# Leaf Doctor data card

## Model

The bundled model starts from [`Huyt/arabica-coffee-leaf-disease-efficientnet-b0`](https://huggingface.co/Huyt/arabica-coffee-leaf-disease-efficientnet-b0) at revision `252d26841543befab22880876f8ca91543230aab`. A checkpoint is saved model weights; fine-tuning adapts them to coffee-leaf classes. It has 4,017,796 learned parameters. The current `coffee-leaf.tflite` file is 8,091,596 bytes (7.72 MiB), stores weights as float16, keeps input, output, and computation in float32, and has SHA256 `19b4f9747604dcff2cc43f44e3056f5c4fd827e3b0556e6632e1acbd1ce6ccda`. The desktop verifier blocked sockets and saw zero attempts; this is not a phone test. B0 stays the app default; B1/B2 options have separate reports. The planned freeze is 4 October 2026 at noon Pacific.

## Data used

Counts are image crops, not independent plants. “Not verified” means the pinned record establishes neither field nor studio capture.

| Source | Licence and link | Images in train/val/test | Image layout |
|---|---|---:|---|
| AGML Arabica | [CC BY 4.0](https://huggingface.co/datasets/Project-AgML/arabica_coffee_leaf_disease_classification) | 3,756 | Field-origin digital-camera images from one Kenyan plantation (Mutira, Kirinyaga County; [provenance](https://pmc.ncbi.nlm.nih.gov/articles/PMC8165403/)); some examples were exposed to base-checkpoint pretraining |
| BRACOL leaf and symptom crops | [CC BY 4.0 data; MIT code](https://data.mendeley.com/datasets/yy2k5y8mxg/1) | 3,499 | Leaf and numeric symptom crops; field/studio layout not verified |
| RoCoLe | [CC BY 4.0](https://data.mendeley.com/datasets/c5yvn32dzg/2) | 1,560 | Field photos from 5MP smartphones at CIIDEA, Calceta, Manabi, Ecuador; varied backgrounds and weather ([provenance](https://pmc.ncbi.nlm.nih.gov/articles/PMC6727496/)) |
| CoffeeLeaf-CO, including Silva-derived crops | [CC BY 4.0](https://zenodo.org/records/22756170) | 12,501 (94 external) | Field photos from consumer Android smartphones in El Socorro, Santander, Colombia, under natural light; Silva derivatives include Brazil ([metadata](https://zenodo.org/api/records/22756170)) |
| Makerere Beans, unsupported class | [MIT](https://huggingface.co/datasets/AI-Lab-Makerere/beans) | 1,295 | Bean/leaf images used only as “not coffee”; layout not verified |

Links, licences, and layouts were checked on 3 October 2026; pinned records are in `training/sources.json`.

The 1,120-image [multispec RGB collection](https://huggingface.co/datasets/Project-AgML/coffee_rust_multispec_classification) was development stress evaluation, never training: 847 rust and 273 NoRust images under CC0 1.0. The 100-image [PG26038 set](https://huggingface.co/datasets/cchery2001/pg26038-coffee-leaf-samples) was untouched external evaluation: flatbed scans of 50 paired leaves under CC BY 4.0.

## Split and leakage checks

The data contains 14,119 train, 3,921 validation, 4,571 test, and 941 external examples, 23,552 total. An exact hash catches byte-identical files; a perceptual hash catches visually similar files. With parent-image and plant-ID fields, these checks form 6,174 groups, and no group crosses partitions. AGML may overlap base-model pretraining, so the internal test is not wholly unseen.

## Results

B0 was rerun locally with its saved thresholds. [`training/results/final-evaluation.json`](../training/results/final-evaluation.json) records the reproduced results and input hashes. TFLite used CPU; the PyTorch checkpoint comparison used the Mac GPU. These figures use the original quality gate; the app’s newer brightness gate and B1/B2 options have separate reports. Raw accuracy is correctness over all images. Accepted coverage is the share passing thresholds; accepted accuracy is correctness among accepted images.

| Evaluation | Raw accuracy | Accepted coverage | Accuracy after acceptance |
|---|---:|---:|---:|
| Internal test, n=4,571 | 91.05% | 81.49% | 93.10% |
| Sources new to fine-tuning, n=3,114 | 89.53% | 74.25% | 91.57% |

Precision is the share of class predictions that are correct; recall is the share of class images found. These are raw, ungated results in output order.

| Class | Internal precision | Internal recall | New-source precision | New-source recall |
|---|---:|---:|---:|---:|
| cercospora | 81.36% | 85.24% | 50.00% | 64.15% |
| healthy | 83.92% | 93.04% | 84.30% | 95.33% |
| miner | 94.97% | 91.40% | 93.04% | 86.36% |
| phoma | 88.03% | 90.95% | 79.47% | 93.02% |
| rust | 91.89% | 90.09% | 91.22% | 87.78% |
| red spider mite | 23.81% | 57.69% | 25.00% | 57.69% |
| weevil damage | 94.74% | 92.73% | 95.07% | 92.73% |
| unsupported | 96.24% | 100.00% | 96.24% | 100.00% |

| External or robustness check | Metric | Result |
|---|---|---:|
| Rust stress, n=1,120 | AUROC | 0.491 |
| Rust stress | Rust recall | 52.66% |
| Rust stress | Specificity | 43.59% |
| Flatbed scans, n=100, 50 leaves | Accepted coverage | 0% |
| Flatbed scans | Supported-class accuracy | 20.00% |
| Flatbed scans | Unsupported rejection | 100% |
| Synthetic severe blur, n=223 | Rejection | 28.70% |
| Synthetic severe darkness | Rejection | 100% |

AUROC is the area under the receiver-operating-characteristic curve, a threshold-independent ranking score. Specificity is the share of negatives rejected. Mite output is disabled. Validation support is 25 mite and 167 cercospora; other classes have 210 to 1,233.

## What the data does not cover

The classes do not cover coffee berry disease, berry borer, coffee wilt, or nutrient deficiency. Red spider mite has too little validation evidence and stays disabled. AGML includes field-origin digital-camera photos from one Kenyan plantation, but that pretraining-exposed source is not prospective farm validation. No representative smartphone validation exists across independent Kenyan farms, and coverage is not established for rain, dusk, or a first-time smartphone user. Scans are flatbed, not phone images; NoRust is a binary negative, not healthy.

## What these numbers mean

These are dataset results, not field accuracy. A score is a model score, not the probability of an agronomist-confirmed diagnosis. A field trial would need prospective photos from independent Kenyan farms, expert or laboratory confirmation, plant-level splits, representative phones and lighting, coverage calibration, and offline reliability and latency measurements.

Every figure in this card comes from `training/sources.json`, `mobile/assets/model/model-config.json`, `training/results/offline-verification.json`, or the reproduced report in `training/results/final-evaluation.json`.
