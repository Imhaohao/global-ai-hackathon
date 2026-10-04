// Writes out/Technical-credits.txt: every source, dataset licence, clip, photo, the voice and the music.
// Usage: node scripts/writeCredits.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUSIC_PROMPT } from "./musicPrompt.ts";
import { VOICE } from "../src/voiceover.ts";

const here = dirname(fileURLToPath(import.meta.url));

const sections: [string, string[]][] = [
  [
    "Figures on screen (repository paths are relative to the repo root)",
    [
      "38 of 100: rural Kenyan adults whose main phone is a basic text phone, 38.4%, Global Findex 2024 indicator con9b.9 (docs/evidence.md line 27; https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?format=json&source=28).",
      "66 of 100: rural Kenyan adults who do not use the internet daily; daily use is 33.7%, Global Findex 2024 indicator con26d.9, read from https://api.worldbank.org/v2/country/KEN/indicator/con26d.9?format=json&source=28 on 4 October 2026. World Bank data is problem evidence only; no model was trained on it.",
      "The 100-farmer grid (src/components/FarmerGrid.tsx) is copied unchanged from videos/shared/FarmerGrid.tsx, shared with the demo video.",
      "Hub path: the Swahili message and its expected fields are eval case shared/src/localModel/evalCases.ts line 17; Qwen3.5-2B is the active hub model (shared/src/localModel/modelCatalog.ts); the matcher asks before it answers (shared/src/localModel/assistedMatch.ts); the reply is SWAHILI_WORDING.confirmFirst in shared/src/smsReply.ts with the rust name from shared/src/diseases.sw.ts, cut with an ellipsis.",
      "SMS path (tiny beat): the hub's SIM receives the text through a BroadcastReceiver for SMS_RECEIVED (hub/modules/sms-gateway, untracked android source); hub/src/answerQuestion.ts tries POST /ask on the backend with an 8 s timeout and otherwise answers on the device with answerWithLocalModel (Qwen3.5-2B, then the rule matcher); replies go back with SmsManager.sendMultipartTextMessage. shared/src/smsReply.ts caps a reply at SMS_MAX_CHARS = 459, three concatenated GSM-7 segments of 153 characters, and turns Latin-script text into plain ASCII.",
      "Sizes (tiny beat), measured: Qwen3.5-2B weights without the vision file 1,280,835,840 bytes (shared/src/localModel/modelCatalog.ts lines 58-62); leaf model mobile/assets/model/coffee-leaf-b2.tflite 8,573,416 bytes; phone app 68,180,288 bytes, a release APK of mobile/ at commit 4ef8721 built by us for arm64-v8a only (expo prebuild, gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a); it bundles all three leaf models (B0, B1, B2). Block areas are proportional to the byte counts.",
      "20,311 labelled training images: training/manifests/scale_v3_manifest.json, README.md line 288. The 40 leaves on screen are real training images, 8 per class, drawn with a fixed seed by analysis/tiles.py.",
      "Coffee leaf rust 0.84: the app's B2 TFLite export on held-out BRACOL test leaf 527 (see rustfocus.py below).",
      "Race on 1,119 external rust images: B2 AUROC 0.778 (README.md line 360). GPT-6 Astra AUROC 0.776 and both run times (1 min 45 s and 58 min 39 s, so 33x) are the team's own benchmark, labelled 'Team benchmark' on screen. The race clock is a time-lapse after Leaf Doctor finishes. AUROC measures ranking, not diagnosis accuracy.",
      "Officer contact: 'Send to field officer' opens the phone's SMS app with the case summary from shared/src/caseSummary.ts (verdict, farm section, GPS with accuracy, decision, recent rain from NASA POWER, model version; text only, no photos) via mobile/src/screens/sendCaseToOfficer.ts; 'Call your field officer' and 'Call KALRO farm research' buttons in mobile/src/screens/OfficerActions.tsx; labels from mobile/src/i18n/strings.ts lines 169 and 278.",
      "Outbreak alerts (commit 275ca29): 3 farms in one area reporting one disease within 7 days builds a draft that an officer edits and approves before anything is sent (shared/src/neighbourAlerts.ts lines 21-22; backend/src/alertRoutes.ts).",
    ],
  ],
  [
    "Analysis computed for this video (videos/technical/analysis)",
    [
      "rustfocus.py: the published B2 model from https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 (revision 31a46d723399aa5bb6305e5a9d1d50a74936f74c), downloaded outside the repository; its model.safetensors (SHA256 eb6a5d4d...) and model.tflite (ddbea876...) are byte-identical to the README's B2 checkpoint and the app export, 7,712,266 parameters. All 53 whole-leaf BRACOL rust photos in the held-out test split were scored with the TFLite export (48 called rust) and given a LayerCAM map fused from MBConv stages 4-6 of the same weights. Each map was scored by how much of its energy falls on the leaf's orange pustule pixels (median 1.87x chance). The leaf shown is the clearest of the 48 correct ones (13.6x chance), so it is a best case, not a typical one.",
      "gradcam.py: real per-stage activation maps of the B2 checkpoint (kept from the earlier cut; not shown in this one). chroma.py and saliency.py results are not shown in this cut.",
    ],
  ],
  [
    "Datasets",
    [
      "CoffeeLeaf-CO v2 (with its Silva derivative), Zenodo record 22756170, CC BY 4.0.",
      "BRACOL, Mendeley yy2k5y8mxg v1 and github.com/esgario/lara2018, CC BY 4.0 data, MIT code; reviewed BRACOL annotations, kaggle.com/datasets/jonatanfragoso/bracol-for-yolov8-detection, CC BY 4.0.",
      "Project-AgML arabica coffee leaf disease classification, Hugging Face revision d7fc77a, CC BY 4.0 (field images from Mutira, Kirinyaga County, Kenya).",
      "Peru coffee leaves (Saposoa), Mendeley mfpxg4y65r v2, CC BY 4.0.",
      "RoCoLe, Mendeley c5yvn32dzg v2, CC BY 4.0.",
      "Makerere beans (non-coffee, taught as unsupported), Hugging Face AI-Lab-Makerere/beans, MIT per dataset card.",
      "External rust stress set: Project-AgML coffee_rust_multispec_classification, CC0 1.0 (evaluation only).",
    ],
  ],
  [
    "Sources for the method",
    [
      "Talhinhas et al. 2017, The coffee leaf rust pathogen Hemileia vastatrix, Molecular Plant Pathology (orange uredinia on the leaf; the colour rust_mask in rustfocus.py looks for). https://pmc.ncbi.nlm.nih.gov/articles/PMC6638270/",
      "Jiang, Zhang, Hou, Cheng and Wei 2021, LayerCAM: Exploring Hierarchical Class Activation Maps for Localization, IEEE Transactions on Image Processing. https://mmcheng.net/layercam/",
    ],
  ],
  [
    "Pictures, footage and 3D",
    [
      "Field officer: 'Farm Extension Worker', Meru County, Kenya, Wiki Loves Africa 2017, by Samuel Macharia (User:Smacharia), CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Farm_Extension_Worker.jpg (cropped to the officer). The photo is unchanged apart from the crop and is shared under the same licence.",
      "OpenAI symbol: https://commons.wikimedia.org/wiki/File:OpenAI_logo_2025_(symbol).svg, public domain (text and simple shapes); a trademark of OpenAI, used only to label the benchmark comparison. No endorsement by OpenAI is implied.",
      "Noor's basic phone, the hub phone, the SMS route and the size blocks are drawn in code for this video.",
      "Leaf images: BRACOL, AGML, RoCoLe and CoffeeLeaf-CO training images (CC BY 4.0) and BRACOL test leaf 527, shown as the 224-pixel crop the network sees.",
      "Type: Alegreya by Juan Pablo del Peral (Huerta Tipográfica), SIL Open Font License, via Google Fonts; Atkinson Hyperlegible Mono for figures and JSON.",
      "Leaf Doctor B2 model card and weights: https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 (the team's model; weights not committed here).",
      "App screen recording: the team's iPhone recording of the Leaf Doctor leaf scan camera, 3 October 2026. Ours.",
      "Icons: Phosphor Icons, MIT.",
    ],
  ],
  [
    "Sound",
    [
      `Voice: ElevenLabs, ${VOICE.name}, voice id ${VOICE.id}, model ${VOICE.model}. Licence: ElevenLabs terms of service.`,
      `Music: generated with the ElevenLabs Music API (music_v1, 59.5 s, instrumental) for this video. Prompt: "${MUSIC_PROMPT}". Ducked under the voice; the mix is mastered to -14 LUFS. Licence: ElevenLabs terms of service.`,
      "Sound effects: synthesised by scripts/sound.py (copied from reels/). Ours.",
    ],
  ],
  [
    "Notes",
    [
      "Noor is the fictional farmer from the hackathon brief. The farmers are drawn icons; no real or generated people appear.",
      "The app bundles B0 by default; B1 and B2 are selectable. The leaf scan recording does not show which model was selected.",
      "Dataset accuracy is not field accuracy, and speed on a real phone is not measured yet. On external scans the models are much weaker, which is why unsure results go to a person.",
      "World Bank data is evidence for the problem only; no model was trained on it. Leaf Doctor has no World Bank partnership or endorsement.",
    ],
  ],
];

const text = ["Leaf Doctor: technical video credits and sources", ...sections.flatMap(([title, lines]) => ["", title, ...lines.map((line) => `- ${line}`)])].join("\n");
const file = resolve(here, "../out/Technical-credits.txt");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${text}\n`);
console.log(`wrote ${file}`);
