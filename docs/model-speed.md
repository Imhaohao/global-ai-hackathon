# Coffee-leaf model emulator speed

No controlled speed result is available yet. The development app was built and installed, and six credited photos were added to the gallery. Repeated gallery checks are pending authorization to use adb for UI automation because the computer-use tool cannot control this emulator window. Existing log lines from other interactions were not counted as a benchmark.

This is a snapshot of the current model on 3 October 2026, before the plan's 4 October noon cutoff. A later model change would require another measurement.

| Model | Value |
|---|---|
| Version | `deployed-v1` |
| SHA256 | `19b4f9747604dcff2cc43f44e3056f5c4fd827e3b0556e6632e1acbd1ce6ccda` |
| File size | 8,091,596 bytes |

| Environment | Value |
|---|---|
| Device profile | Pixel 2 (Edited) API 33 |
| Android | 13, API 33 |
| Configured RAM | 2,048 MiB |
| Guest memory reported by `/proc/meminfo` | 2,009,304 KiB |
| CPU | Four virtual cores, `arm64-v8a` |
| Emulator | 31.3.14.0, build 9322596 |
| Host CPU | Apple M5 Pro |
| App | Expo SDK 57 development build with Hermes and CPU inference |

| Measurement | Result |
|---|---|
| Controlled inference count | Not measured |
| Median | Not measured |
| 90th percentile | Not measured |
| Slowest inference | Not measured |
| Native model load time | Not measured |
| App responsiveness | Not measured |

**Emulator on Apple M5 Pro; a real low-cost phone will differ, likely slower.** These results must not become phone estimates. Development asset downloads from Metro are not native model load time or proof of production offline operation.

## Photos and method

`training/results/emulator-metadata.json` records six previously extracted coffee-leaf photos from [Project AgML's Arabica dataset](https://huggingface.co/datasets/Project-AgML/arabica_coffee_leaf_disease_classification), under CC BY 4.0. Credit: Jepkoech, Mugo, Kenduiywo and Chebet (2021), *Arabica coffee leaf images dataset*, Data in Brief 36, 107142. The metadata includes original paths, file hashes, dimensions and gallery filenames. The source card was checked on 3 October 2026. These photos serve only as speed fixtures.

The app logs elapsed time around the awaited `model.run` call. Resizing, JPEG decoding, the quality check and result rendering are excluded. Include warm-up calls and photos that fail quality; do not discard slow samples. Keep the development scenario override off so every check runs the actual model.

Start the app with `cd mobile && npx expo run:android`. Clear logcat before a controlled run, then check the same six photos repeatedly until at least 30 `[leaf-model]` lines are recorded. Save only those lines to `training/results/emulator-logcat.txt` and run from the repository root:

```sh
training/.venv/bin/python training/model_speed.py \
  --log training/results/emulator-logcat.txt \
  --metadata training/results/emulator-metadata.json
```

The script refuses fewer than 30 samples or a mismatched model hash. It keeps each sample and computes the median and 90th percentile by linear interpolation. Update this document from `training/results/model-speed.json` only after a controlled run.
