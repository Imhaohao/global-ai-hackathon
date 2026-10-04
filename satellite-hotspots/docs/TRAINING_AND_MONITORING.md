# Training and daily crop inspection

The optional model uses Hugging Face `nvidia/mit-b0` (SegFormer) with a new four-band input and eight independent segmentation outputs. Its fine-tuning dataset is [SHI Labs Agriculture-Vision](https://huggingface.co/datasets/shi-labs/Agriculture-Vision). Labels can overlap, so training uses masked multilabel binary cross entropy rather than a single exclusive label per pixel.

The target classes are drydown, nutrient deficiency, water, weed clusters, double planting, end rows, planter skips and waterways. These are visual field anomalies. **This dataset has no coffee disease or pest-species labels.** We cannot call increasing anomaly extent coffee rust progression or a spreading pest infestation. Leaf datasets do not close that overhead-image gap.

## Run or extend training

Keep dependencies in this component's environment. The original standard-library demo still runs without them.

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate ; macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements-ml.txt
python -m training.prepare_agriculture /path/to/Agriculture-Vision-2021.tar.gz --output /path/to/pilot-data --train-count 128 --val-count 64
python -m training.train --data /path/to/pilot-data --output models/agriculture-pilot --epochs 4
```

The official HF archive is about 21 GB. The preparation utility copies a bounded selection with one tile per distinct field, respects the original train/validation splits, rejects field overlap, and verifies all channels and labels exist. The full dataset stays outside the portable package. The selection is an integration pilot, not a representative performance study. Seed, exact sample IDs, dependency versions, pretrained revision, checkpoint hash, training losses and per-class held-out pixel metrics are saved with the checkpoint. Pixel-level metrics are computed at the recorded training input size (256), not at native full-field resolution. No test set is used for fitting or model selection. The saved checkpoint is the trained epoch with lowest unweighted masked validation BCE, which can favor background; foreground IoU and recall must also be reviewed. A class with no validation positives provides no evidence of recall for that class.

Use more diverse fields, seasons and sites for substantive training. Maintain field/site-separated evaluation and reserve an untouched test set. Calibrate thresholds using validation data and report foreground precision, recall, spatial localisation and false alerts per farm visit. The included 0.65 monitoring threshold and class weights are illustrative. Scores are not calibrated disease probabilities.

## Expanded training and evaluation

An expanded checkpoint is saved separately under `models/agriculture-expanded/`; the original pilot remains available for comparison. Its training set contains 4,096 images from 1,950 official training fields, selected using seeded field/tile ranking and round-robin sampling so that large fields do not dominate the first samples. Model selection uses 192 other fields. A locked evaluation set uses 256 further fields, excluding every original pilot-validation field. Each evaluation field contributes one tile, and all three field sets are disjoint.

The challenge's official test partition has no public anomaly labels. Therefore this labelled locked test is a separate partition of the official validation fields, rather than a claim to an official challenge test score. The new checkpoint continues the original weights, uses rotations/flips and modest gain augmentation, combines masked BCE with Dice loss, moderates positive-class weighting, and selects the checkpoint using mean foreground IoU at fixed threshold 0.5. Early stopping monitors validation only. Per-class operating thresholds are then selected from validation only and frozen before final test evaluation. Scores remain uncalibrated; threshold selection is not probability calibration or satellite-domain validation.

The Mac run was interrupted during epoch 10. The imported best checkpoint from completed epoch 9 has validation mean foreground IoU **35.25%** at threshold 0.5. This value was reproduced on Windows before continuing. The imported folder has no completed training summary, optimizer state, final thresholds, or locked-test evaluation; it cannot be used directly with `CropModel` until compatible metadata is supplied. Its weights are preserved unchanged.

The Windows continuation uses that checkpoint as a warm start, starts a fresh optimizer/schedule, and saves to `models/agriculture-windows-20261003/`. It retains the starting weights unless validation improves. The new original-pilot versus selected-checkpoint comparison uses the **same** 256 locked fields, first at the same fixed 0.5 threshold, then at their respective validation-selected thresholds. The completed run wrote `locked-test-comparison.json`, `threshold-selection.json`, and `training-summary.json` inside the Windows model directory. `test-freeze.json` records checkpoint hashes and thresholds before locked-test labels are loaded. The original 10.6% pilot result was on a different, smaller validation set, so it must not be used as the baseline for the new test comparison.

To reproduce preparation, first stream the archive's filenames into a JSON inventory with `splits.train` and `splits.val` listing stems from the `masks` directory. No image or annotation values are needed to choose the field partitions. Then run from this component:

```sh
python -m training.prepare_expanded --archive /path/to/Agriculture-Vision-2021.tar.gz --inventory /path/to/archive-inventory.json --pilot-manifest models/agriculture-pilot/sample-manifest.json --output /path/to/expanded-data
python -m training.train_expanded --data /path/to/expanded-data --initial models/agriculture-pilot --output models/agriculture-expanded --epochs 12 --batch-size 8
```

The original 512-pixel source files and a 256-pixel cache are now on Windows at `..\work\data\agriculture-expanded\`. Images use bilinear resizing; overlapping labels and validity/boundary masks use nearest-neighbour resizing. Do not create a new model in a directory containing a checkpoint you want to retain.

The Windows run uses Python 3.12.14 and CPU PyTorch in the isolated environment. Optional continuation training requires Python 3.11 or later. To recreate the recorded environment, first install `torch==2.14.1+cpu` from `https://download.pytorch.org/whl/cpu` using pip's `--index-url`, then install `requirements-windows-lock.txt`. [AMD's documented ROCm 7.2.1 Windows limitations](https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/limitations/limitationsrad.html) list no ML training support for that release; no driver changes were made. Reproduce the continuation into a **new** directory:

```powershell
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
& '.\.venv\Scripts\python.exe' -m training.train_expanded `
  --data '..\work\data\agriculture-expanded' `
  --initial 'models\agriculture-expanded' `
  --metadata-source 'models\agriculture-pilot\training-summary.json' `
  --reference 'models\agriculture-pilot' `
  --output 'models\agriculture-windows-new-run' `
  --epochs 3 --min-epochs 2 --patience 2 --batch-size 8 --threads 4 --lr 0.00002
```

`run-provenance.json` records the actual imported weight hash separately from the original pilot metadata template. A completed epoch also saves the latest model, optimizer, scheduler, random-generator states, and history in `latest-training-state.pt`; automatic exact-state resume is not implemented. `model.safetensors` is the validation-selected model, which may differ from the latest training state. Never load an untrusted training-state pickle.

Use the completed Windows model through the unchanged inference interface:

```sh
python -m hotspots infer prepared-field.json --checkpoint models/agriculture-windows-20261003 --output expanded-daily-output
python -m hotspots monitor expanded-daily-output/predictions.json --output expanded-daily-output --state expanded-daily-state.sqlite
```

Monitoring still uses its illustrative global 0.65 threshold unless explicitly configured. Per-class validation thresholds are recorded for research evaluation and are **not** silently applied to monitoring. An updated model can change predicted areas without any real change to vegetation. Reprocess the whole acquisition history with one model version before comparing dates, rather than mixing old-model and new-model predictions as evidence of spread.

The imported source audit is retained in `validation/expanded/data-audit.json`; its download statements describe the Mac work, not every dataset being present on Windows. Windows separately downloaded the official WeedsGalore archive and extracted its 26 test images, required bands/labels, split lists, and licence to `..\work\data\weedsgalore\`. The transfer check uses only these test images after model selection, with weed-cluster thresholds frozen on Agriculture-Vision validation. Run `python -m training.evaluate_transfer --checkpoint models/agriculture-windows-20261003 --reference models/agriculture-pilot --weedsgalore ../work/data/weedsgalore --output validation/windows-transfer.json`. Its individual-weed labels and sensor/scaling differ from Agriculture-Vision's weed-cluster labels, so it is not a matched-task benchmark. The 1,120-image coffee-rust multispectral dataset contains close-ups of individual leaves; these were downloaded and inspected, but never mixed into overhead segmentation training. The Sentinel-1 coffee plantation dataset labels coffee/eucalyptus/background rather than disease. The Tomiño vineyard supplies documented grape disease points, but raw drone-band preparation is still required. None supplies validated satellite coffee disease progression labels.

A further [Finca Irlanda coffee rust monitoring dataset](https://zenodo.org/records/20501979) contains 65,920 dated plant records from 2013–2025, with 128 nonmissing quadrat IDs, rust counts, leaf counts and plant-status records. This is promising disease-progression supervision. The download is monthly field observations rather than overhead imagery, and it lacks plot coordinates and paired acquisitions; it was inspected but never used as pixel-level training labels. Coordinates, date matching, missing-observation handling and accounting for replanting/shade would be needed to connect it to imagery. This monthly dataset cannot validate daily disease forecasts.

The Mac handoff also described a mapped Ames NAIP comparison. That historical crop has no confirmed damage labels, its native aerial pixels differ from the training imagery, and one date cannot establish spread. A new Windows Ames comparison has not been performed. Windows integration can instead be checked using clearly labelled synthetic inputs through the real checkpoint adapter and monitoring pipeline; this checks software behavior, not model accuracy on a real field.

## Windows results

The Windows CPU continuation completed 2 passes over the 4,096-image training set and 1,024 optimization steps. The passes scored 34.36%, 34.62% on validation, below the imported checkpoint's 35.25%. Early stopping retained the imported weights (selected continuation epoch 0). The selected checkpoint hash is `020fc708cbac41cf5a58d9cc3c3cf161156f34c8290411aa72e3bb574f9895d7`. The expanded-versus-pilot improvement below came from the preceding expanded training, not from the two Windows continuation passes.

| Evaluation on the same 256 held-out fields | Original pilot | Selected expanded model |
| --- | ---: | ---: |
| Mean foreground IoU, fixed threshold 0.5 | 7.08% | 35.97% |
| Mean foreground IoU, validation-selected per-class thresholds | 13.27% | 36.45% |

IoU measures the overlap between predicted and labelled anomaly pixels. These results concern Agriculture-Vision aerial imagery; they do not establish satellite coffee-disease performance. The full class precision/recall/IoU, pixel support, and thresholds are retained in `models/agriculture-windows-20261003/locked-test-comparison.json`. The locked test has now been evaluated. Do not use it for further tuning or describe it as untouched in future experiments.

On all 26 official WeedsGalore test images, weed IoU was 18.42% for the pilot and 13.65% for the selected model, at thresholds previously frozen on Agriculture-Vision validation. This is an exploratory transfer check with different sensors and label semantics. See `validation/windows-transfer.json` for precision, recall, counts, provenance, and per-image results.

The selected model also passed actual offline inference over 4 synthetic dates. The monitoring output retained `domain_validated: false`, recognized the cloudy frame, returned `stale_imagery`, sent zero messages, and rejected live mode before accessing any provider. Evidence is in `validation/windows-integration/verification.json`. Run this integration check into a fresh directory with `python -m training.verify_integration --checkpoint models/agriculture-windows-20261003 --output validation/new-integration-check`.

## Connect to the skeleton

Keep the original prepared JSON import contract: genuine aligned native red/NIR reflectance, cloud/shadow/validity masks, coffee target mask, exact grid and external preparation notes. Add `field_id` and `sensor` at the manifest root. Every observation must add:

```json
{
  "model_input": {
    "path": "images/2026-10-03.npz",
    "channels": ["red", "green", "blue", "nir"],
    "scaling": "unit_interval",
    "preparation": "Describe sensor, value scaling, registration, quality checks and radiometry here."
  }
}
```

The NPZ has a numeric array named `image` with shape `[4, rows, cols]`, in R/G/B/NIR order, values in [0,1], on the exact observation grid. No pickled arrays. Paths must stay under the manifest directory. Model input scaling and the physical reflectance used for NDVI are separate contracts: **do not pass Agriculture-Vision JPEG digital numbers off as calibrated reflectance.** The training input used JPEG /255 and recorded channel normalisation. A new satellite sensor/product must be evaluated and harmonised to that model domain. The model resizes internally to 256 and returns scores on the observation grid; interpolating output does not recover additional spatial detail. Masking values before convolution does not eliminate all cloud-edge artifacts; real quality preparation should exclude an appropriate edge buffer.

```sh
python -m hotspots infer prepared-field.json --checkpoint models/agriculture-pilot --output daily-output
python -m hotspots monitor daily-output/predictions.json --output daily-output --state daily-state.sqlite
```

Inference writes compressed per-date scores, a prediction manifest and the original NDVI report under `daily-output/ndvi/`. Monitoring writes `monitor.html`, `monitor.json` and `sms-outbox.json`. The anomaly map and NDVI view remain distinct so that model scores cannot replace a measured vegetation change. The pilot inference adapter always declares `domain_validated: false`.

## Progression and missing images

Retain the entire ordered acquisition history and a fixed registered grid. Tracking links connected anomaly regions by overlap, records parent IDs for splits/merges, and measures newly flagged cells in the area visible on both dates. A growth alert requires persistent overlapping cells, an increased comparable extent, sufficient field coverage, and full visibility of the previous affected region. First sightings appear on the map but do not alone establish progression. This prototype alerts on growing persistent extent; it does not yet alert on severity alone or unchanged first detections. Area is reported in m² only when grid units are metres; row/column locators are also provided.

No usable acquisition means no new evidence. Cloudy frames are recorded as unknown and do not erase tracks. Images older than the configured age limit suppress current alerts. Gaps are recorded in days; growth is an observation-to-observation comparison, not a daily measured rate. Tracks based only on pixel overlap can lose identity after large displacement, gaps or registration errors; coffee deployment needs validation of this association method as well as the detector.

Monitoring is deterministic replay of history. A SQLite outbox prevents repeat sends of the same field/model/date/class/track event, and stores acquisition statuses. Keep history unchanged once published: replacing/removing past dates can change track IDs. Concurrent workers claim an SMS before sending. A timeout or crash after a provider request leaves `unknown`/`sending`; reconcile the provider receipt manually before retrying. Provider acceptance is not delivery confirmation; delivery callbacks are not implemented. Different model versions have distinct histories/events and must be reviewed before switching live monitoring.

## Daily execution

`scripts/Run-Daily.ps1` runs inference then monitoring on Windows. It is ready for Windows Task Scheduler, but no task is installed in this package. It requires a separately configured imagery adapter to publish a complete manifest atomically. The archive provider in the original skeleton remains unimplemented; no field or account credentials were supplied. A scheduled run cannot guarantee fresh cloud-free imagery every day.

Example Task Scheduler action: run `powershell.exe` with arguments pointing to `Run-Daily.ps1`, `-Manifest`, `-Checkpoint`, and the ML environment's `-Python` path. Configure a daily trigger, prevent overlapping runs, and capture failure logs. Account/imagery integration and deployment remain explicit setup work.

## SMS

The default is a local draft. `config/sms.example.json` is deliberately dry-run. The Twilio adapter uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM` from the environment; never put secrets in source files. Its API reference is [Twilio Messages](https://www.twilio.com/docs/messaging/api/message-resource).

Live sending requires `mode: live`, the configured field ID, a recipient E.164 phone number, recorded recipient consent and a target-domain validation record. Synthetic/unvalidated data, historical replay and stale/insufficient observations cannot send live. Current inference output from the pilot cannot send live. Do not flip the validation flag to work around missing science; replace it with an adapter backed by a reviewed validation record when a suitable model is available. For this research pilot, test provider behavior with the included fake sender.

Messages say “suspected [anomaly] area increased”, provide acquisition date and inspection rows/columns, and state that cause is unconfirmed. They never identify a pathogen, recommend pesticides, or claim pest spread. Disease/pest-specific warnings require overhead coffee imagery, confirmed diagnoses/severity, pest counts and dates, plus independent field validation.

## Licences and limits

The NVIDIA base weights/code licence linked by its model card permits research/evaluation only. The required licence is retained alongside the checkpoint. Agriculture-Vision has [custom terms](https://github.com/SHI-Labs/Agriculture-Vision#download). Commercial deployment needs an appropriately licensed model/data stack and target-domain validation. The repository and pipeline are a research prototype; no farmer has received an SMS, no scheduler has been installed and no live satellite account is connected.
