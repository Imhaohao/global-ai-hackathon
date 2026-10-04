# Crop anomaly pilot checkpoint

Hugging Face base: [nvidia/mit-b0](https://huggingface.co/nvidia/mit-b0), revision `80983a413c30d36a39c20203974ae7807835e2b4`. Fine-tuned locally on a field-separated subset of [Agriculture-Vision](https://huggingface.co/datasets/shi-labs/Agriculture-Vision).

**Research prototype. Not validated for coffee or satellite imagery. No disease/pest-specific labels. No farmer alerts should rely on this checkpoint.**

Four input channels: R/G/B/NIR. Eight independent sigmoid outputs. Four epochs, 128 optimizer steps, 128 training tiles from distinct fields and 64 validation tiles from distinct other fields. The checkpoint is epoch 4, selected using the lowest masked validation BCE. The seed is 17; exact sample IDs and training history are alongside this file. This is a bounded pilot rather than full-dataset training.

## Held-out results

Mean IoU over all eight classes: **10.6%**, compared with 2.4% before fine-tuning of the newly initialized head. IoU measures spatial overlap, not classification accuracy. The results show substantial false positives and missed classes. In particular, water, double planting and end rows have zero recall at this threshold.

Metrics use score threshold 0.5 and 256×256 inputs. The monitoring threshold 0.65 is illustrative and has not been calibrated. No probability calibration, field alert precision, disease progression validation, pest validation, untouched test-set evaluation or target-domain validation has been performed.

| Class | IoU | Precision | Recall |
|---|---:|---:|---:|
| drydown | 31.4% | 32.3% | 91.6% |
| nutrient deficiency | 14.8% | 17.2% | 51.2% |
| water | 0.0% | — | 0.0% |
| weed cluster | 15.6% | 15.9% | 92.2% |
| double plant | 0.0% | 0.0% | 0.0% |
| endrow | 0.0% | — | 0.0% |
| planter skip | 20.2% | 20.2% | 100.0% |
| waterway | 3.1% | 3.1% | 99.8% |

Class imbalance, a small nonrepresentative sample, season/crop differences and a different satellite sensor can all affect these results. The model card does not claim operational early warning capability. Growth tracking currently measures spatial extent, not pathogen transmission or changes in disease severity.

## Verification

The saved checkpoint was loaded offline and exercised on real held-out imagery and on the synthetic skeleton manifest. See `validation/held-out-drydown.png` (one deliberately selected example, not representative accuracy), `validation/held-out-inference.json`, `validation/model-integration.txt`, and the tests. The model hash is `15405397497cc1e4b13c19afb368308222070c28ba5a65b7fbefc98c730ef0bd`. The original public archive SHA-256 is recorded in `validation/dataset-checksum.json`. The full dataset is kept in the task's scratch area, outside this portable component.

A PyTorch 2.13 MPS batch-normalization backward issue was resolved by forcing contiguous decoder feature maps; parameters and model architecture are unchanged. The saved model also runs on CPU without network access.

## Licence

The NVIDIA licence accompanying this checkpoint permits research/evaluation use only. Keep `NVIDIA-LICENSE.txt` with redistributed weights. Agriculture-Vision has custom dataset terms. An operational/commercial system needs suitable model/data rights and independent coffee-field validation.
