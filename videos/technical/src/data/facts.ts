export const SPLIT = { train: 20311, val: 5294, test: 5868 }; // scale_v3_manifest.json, README.md line 288
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
// Global Findex 2024: con9b.9 (docs/evidence.md line 27) and con26d.9 rural daily internet use 33.7%
// (https://api.worldbank.org/v2/country/KEN/indicator/con26d.9?format=json&source=28), so 66 in 100 are not online daily.
export const ACCESS = { basicPhone: 38, notDailyOnline: 66 };
// The external rust race: README.md line 360 for B2's AUROC; the Astra AUROC and both times are the team's benchmark.
export const RACE = { images: 1119, oursSeconds: 105, astraSeconds: 3519, oursAuroc: "0.778", astraAuroc: "0.776" };
// Sizes measured for the "tiny" beat, in bytes.
// Qwen3.5-2B Q4_K_M weights without the vision file: shared/src/localModel/modelCatalog.ts lines 58-62.
// Leaf model: mobile/assets/model/coffee-leaf-b2.tflite (ls -l). App: a release APK of mobile/ at commit 4ef8721,
// built for arm64-v8a only (expo prebuild + gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a); it bundles
// all three leaf models.
export const SIZES = { hubModel: 1280835840, leafModel: 8573416, app: 68180288 };
// shared/src/smsReply.ts line 4: SMS_MAX_CHARS = 459, three concatenated GSM-7 segments of 153.
export const SMS_SEGMENTS = 3;
