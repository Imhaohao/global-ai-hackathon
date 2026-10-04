// Every figure on screen, with the file it comes from. Paths are relative to the repository root.

export const DATASETS = [
  { name: "CoffeeLeaf-CO", origin: "Santander, Colombia", licence: "CC BY 4.0", train: 8309 },
  { name: "BRACOL", origin: "Brazil, with expert-reviewed crops", licence: "CC BY 4.0", train: 7513 },
  { name: "AGML arabica", origin: "Kirinyaga, Kenya", licence: "CC BY 4.0", train: 1278 },
  { name: "Peru", origin: "Saposoa, Peru", licence: "CC BY 4.0", train: 1105 },
  { name: "RoCoLe", origin: "Manabí, Ecuador", licence: "CC BY 4.0", train: 1072 },
] as const;
// Train rows per source in training/manifests/scale_v3_manifest.json; licences in training/sources.json.
export const NON_COFFEE = { name: "Makerere beans", role: "non-coffee leaves, taught as unsupported", licence: "MIT", train: 1034 };

export const SPLIT = { train: 20311, val: 5294, test: 5868 }; // scale_v3_manifest.json, README.md line 288
export const GROUPS = { total: 6259, crossing: 0, test: 982 }; // computed from scale_v3_manifest.json "group"; README.md line 345 (982)

export const MODEL = {
  params: "7.7M", // README.md line 314: 7,712,266
  sizeMb: 8.57, // README.md line 368; mobile/assets/model/coffee-leaf-b2.tflite is 8,573,416 bytes
  responseMs: 98, // training/reports/model_comparison_b3/single_image_timing.json total_response.mean_ms 98.05, desktop CPU
  valAccuracy: 93.33, // README.md line 328
};

// MBConv stages of EfficientNet-B2 at 224 px: channels and grid from analysis/gradcam.py (stage_shapes).
// blocks.5 and blocks.6 (stages 6 and 7), conv_head and the classifier train in the second phase: training/b1_train.py line 321.
export const STAGES = [
  { channels: 16, grid: 112, trains: false },
  { channels: 24, grid: 56, trains: false },
  { channels: 48, grid: 28, trains: false },
  { channels: 88, grid: 14, trains: false },
  { channels: 120, grid: 14, trains: false },
  { channels: 208, grid: 7, trains: true },
  { channels: 352, grid: 7, trains: true },
] as const;

// README.md lines 351-369, the four-model comparison on the same 5,868 held-out images.
export const ACCURACY = [
  { model: "B0", value: 86.79 },
  { model: "B1", value: 93.27 },
  { model: "B2", value: 94.09 },
  { model: "B3", value: 93.22 },
] as const;

export const BENCH_ROWS = [
  { label: "Macro F1", b0: "0.761", b2: "0.872" },
  { label: "Non-coffee leaves accepted", b0: "38 / 202", b2: "0 / 202" },
  { label: "Smaller-leaf macro F1", b0: "0.568", b2: "0.844" },
  { label: "Accuracy on accepted photos", b0: "88.09%", b2: "95.14%" },
] as const;

// README.md line 360 (B2 AUROC). The GPT-6 Astra figures and both timings are the team's own benchmark, not in the repo.
export const EXTERNAL_RUST = { images: 1119, b2: "0.778", b2Time: "1 min 45 s", astra: "0.776", astraTime: "58 min 39 s" };

// mobile/assets/model/model-config-b2.json and shared/src/plantVote.ts lines 4-6.
export const VOTE = { leaves: 6, agree: 3, share: 60 };

// PROGRESS.md / README.md lines 526-528, shared/src/localModel/evalCases.ts line 17, modelCatalog.ts lines 58-62.
export const HUB = {
  model: "Qwen3.5-2B",
  sizeGb: 1.28,
  fields: "84 / 94",
  wrongFinal: 0,
  messages: 24,
  swahili: "majani yana unga wa rangi ya machungwa chini",
  english: "the leaves have orange powder underneath",
};

// docs/evidence.md lines 62-103, evals/kikuyu/results.json (FLORES-200 devtest).
export const KIKUYU = { readAsSwahili: "97 / 100", flagged: "1,010 / 1,012", falseFlags: "0 / 1,012" };

// shared/src/hotspots.ts lines 5-8, mobile/src/hotspots/useHotspotView.ts line 16, mobile/src/storage/observations.ts line 8.
export const HOTSPOTS = { linkMetres: 25, repeatMinutes: 30, repeatMetres: 15, trendWeeks: 8, thumbnailPx: 320 };

// shared/src/neighbourAlerts.ts lines 21-22 (commit 275ca29).
export const ALERTS = { farms: 3, days: 7 };

// Kenya Agricultural Sector Extension Policy, December 2023, page 8 (docs/research-sources.md line 21).
export const EXTENSION_TARGET = { farmers: 600, year: 2029 };
