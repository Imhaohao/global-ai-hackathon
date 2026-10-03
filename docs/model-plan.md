# Leaf Doctor model plan: fine-tuning, data card and speed test

Written Sat 3 Oct 2026. Submission closes at the end of Sun 4 Oct 2026. This file is the whole brief for the person (and their agent) who owns the coffee-leaf model. Read it top to bottom before starting. Three other agents are building the rest of the app at the same time from `docs/build-plan.md`. You do not need to read that file, but you must keep the contract below so their work keeps running when your new model lands.

## What you own

| Path | Notes |
|---|---|
| `training/` | All scripts, sources and results |
| `mobile/assets/model/coffee-leaf.tflite` | The model the phone runs |
| `mobile/assets/model/model-config.json` | Labels, thresholds, calibration, quality gate |
| `mobile/src/diagnosis/classifyLeaf.ts` and `modelDecision.ts` | How the phone prepares a photo and reads the model |
| `README.md`, section "Local coffee-leaf model" | Model facts and results |
| `docs/data-card.md` (new) | The one-page data card for the judges |
| `docs/model-speed.md` (new) | Emulator speed result |

Do not edit anything else. In particular, `mobile/src/diagnosis/diagnosePlant.ts`, `shared/`, `mobile/src/screens/`, `hub/` and `backend/` belong to other agents.

## The contract you must keep

Other code reads the model through this contract. Breaking it breaks the app without any error at build time.

1. **Output order stays exactly:** `cercospora, healthy, miner, phoma, rust, red_spider_mite, weevil_damage, unsupported`. Eight outputs. Calibrated softmax stays inside the graph.
2. **Input stays exactly:** float32 RGB in 0-255, shape `[1, 224, 224, 3]`, prepared by resizing the shortest side to 256 and centre-cropping 224.
3. **`model-config.json` keeps its shape.** You may change any threshold, the quality limits, the version and the hashes. Do not rename keys. `app_condition_keys` must stay equal to `DISEASE_KEYS` in `shared/src/types.ts`: `cercospora, healthy, miner, phoma, rust, mites, weevil`.
4. **`classifyLeaf(model, photo)` returns** `{ condition, probability, confidence, qualityPassed }`, where `confidence` is `'confident' | 'possible' | 'unclear'` and `qualityPassed` says whether the darkness and blur gate passed. Task 1 below adds `qualityPassed`; nothing else in the return value changes.
5. **Mites and `unsupported` always come back `unclear`** unless new validation evidence supports enabling mites. If you enable mites, say so in the commit message and the data card.
6. **Before every push**, run `node training/check_mobile_contract.cjs` and `cd mobile && npx tsc --noEmit && npx expo lint`. All must pass.

Freeze the model at **Sun 4 Oct 12:00**. After that, push no new model file. Tasks 3 and 4 must describe the frozen model.

## Ground rules

- Use the repo's default git user. Never add an AI co-author or attribution line. One commit per finished, verified step, with a message that says what changed. Pull `main` before you push, and never force-push.
- Functions stay at cyclomatic complexity 15 or lower; the lint enforces it in `mobile/`. Hold Python in `training/` to the same bar.
- Code explains itself through names. Comments only for tricky logic. No emojis.
- Every number in a document comes from a file the scripts produced, committed to the repo, or from a source with a link and date. Never round a weak result up or leave it out. Write "not measured" when something was not measured.
- Do not write summary markdown files or copies of files beyond the two documents named here.
- Stop any emulator or long-running process you started when you finish.

## Task 1: add `qualityPassed` to `classifyLeaf` (do this first, about 15 minutes)

The plant-vote agent needs to know, for each leaf, whether the photo passed the quality gate. Today `classifyLeaf` folds a failed gate into `confidence: 'unclear'`, which hides the reason.

- Add `qualityPassed: boolean` to the `Diagnosis` type in `mobile/src/diagnosis/classifyLeaf.ts`, and set it from `passesQuality(input)`.
- Keep the existing behaviour that a failed gate makes `confidence` `'unclear'`.
- Under `__DEV__` only, log one line per call so Task 4 can read timings: `console.log(\`[leaf-model] inference_ms=${ms.toFixed(1)} quality=${passed}\`)`. Measure only `model.run`, using `performance.now()`.
- Run the checks in contract item 6, commit as "Report quality gate result from classifyLeaf", and push to `main` straight away. Other agents are waiting on it.

## Task 2: fine-tuning (your own work, until the Sunday 12:00 freeze)

Carry on improving the model as you planned. The current weak spots, in order of how much they hurt the submission:

1. Rust stress set: AUROC 0.491, rust recall 52.66%, specificity 43.59%.
2. Severe blur rejected only 28.7% of the time, so blurry phone photos can still get an answer.
3. Cercospora precision 0.50 on sources new to fine-tuning.
4. Red spider mite disabled, for lack of validation examples.

For every candidate you keep:

- Select checkpoints and thresholds on validation data only, as now. Never tune on the test, external or stress sets.
- Re-run the whole downstream chain: `calibrate_rejection.py`, `export_mobile.py --publish`, `final_evaluation.py`, `verify_offline.py`, then `node training/check_mobile_contract.cjs`.
- Save the final evaluation output to `training/results/final-evaluation.json` and commit it. Today these numbers only live in an untracked run folder, and the data card must point to a committed file.
- Update the "Local coffee-leaf model" section of `README.md` with the new numbers, the new SHA256 and the new size.
- If a candidate is worse on the internal test but better on the external sets, prefer it only if accepted accuracy on sources new to fine-tuning stays at or above the current 91.6%. Write the trade-off in the commit message.

If no candidate beats the current model by the freeze, keep the current one. That is a fine outcome. Say so in the data card.

## Task 3: data card, `docs/data-card.md` (after the freeze)

One page for the judges. The brief says: "You must also indicate what your data does not cover, and this is scored. Most crop-disease datasets, for instance, are studio images on plain backgrounds; a model trained only on them performs poorly on real field photos." Write it for a reader who is smart but not a machine-learning specialist, and define each term the first time it appears.

Include, in this order:

1. **Model.** The base checkpoint (`Huyt/arabica-coffee-leaf-disease-efficientnet-b0` at its pinned revision), parameter count, file size, SHA256, float16 storage, and that it runs offline with no network calls (from `verify_offline.py`).
2. **Datasets used to build it.** A table from `training/sources.json`: name, link, licence, images used, and whether the photos are studio-style, field photos or scans. Include the bean images used as "not coffee" examples.
3. **How the data was split.** Train, validation, test and external counts, and the leakage check (groups by exact hash, perceptual hash, parent image and plant ID, with none crossing partitions). Say plainly that crop counts are not counts of independent plants.
4. **Results.** Raw accuracy, the share of images the thresholds accept, accuracy on accepted images, the same three numbers on sources new to fine-tuning, and precision and recall for each class. Put the external and stress results right beside them, given equal space: rust stress AUROC, flatbed scans, blur rejection.
5. **What the data does not cover.** At least:
   - coffee berry disease
   - berry borer
   - coffee wilt
   - nutrient deficiency
   - red spider mite (if still disabled)
   - phone-camera photos taken in Kenya
   - any Kenyan farm
   - photos taken in rain, at dusk, or by a first-time smartphone user

   Note which classes have few validation examples.
6. **What these numbers are not.** Dataset results, not field accuracy. Scores are model scores, not probabilities of a confirmed diagnosis. What a field trial would need to measure.
7. **Where each number comes from.** The committed file path for every figure.

Keep it under about 900 words, with tables doing most of the work.

## Task 4: emulator speed test, `docs/model-speed.md` (after the freeze)

No physical phone is available this weekend, so measure on an Android emulator and label the result as an emulator result.

1. Use an Android Studio emulator with about 2 GB of RAM, to resemble a cheap phone. Record the emulator's device profile, Android version, RAM, CPU architecture and the host computer's CPU.
2. `cd mobile && npx expo run:android` to build and install the dev app.
3. Put 6 coffee-leaf photos into the emulator's gallery (`adb push <file> /sdcard/Pictures/`). Use photos you may share; say where they came from.
4. In the app, check the same photos repeatedly until you have at least 30 timings. Read them with `adb logcat | grep "\[leaf-model\]"`.
5. Report the median, the 90th percentile, the slowest timing, and the model load time if you can measure it. Note whether the app stayed responsive.
6. State clearly: "Emulator on [host CPU]; a real low-cost phone will differ, likely slower." Do not convert emulator numbers into phone estimates.

Commit as "Add emulator speed result for the frozen leaf model".

## Report back

When done, send a short report:

- the final model's SHA256, size, version, and whether it changed from `19b4f974...`
- the commands run and their results, pasted
- the key numbers, with the committed file each comes from
- anything the app agents must know, such as changed thresholds, mites enabled, or a delayed freeze
