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
      "20,311 training images and the five coffee sources: training/manifests/scale_v3_manifest.json, README.md line 288. Group dots (one per 4 groups): 3,624 train, 884 validation, 982 test groups, none in two splits, counted from the manifest's group field.",
      "Fine-tuned stages: phase 2 trains blocks.5, blocks.6, conv_head, bn2 and the classifier (training/b1_train.py line 321).",
      "Colour 62% and + Texture 93%: computed for this video (see below), on the same 2,839 validation photos.",
      "Race on 1,119 external rust images: B2 AUROC 0.778 (README.md line 360). GPT-6 Astra AUROC 0.776 and both run times (1 min 45 s and 58 min 39 s, so 33x) are the team's own benchmark, labelled 'Team benchmark' on screen. The race clock is a time-lapse after Leaf Doctor finishes. AUROC measures ranking, not diagnosis accuracy.",
      "Officer contact: 'Send to field officer' opens the phone's SMS app with the case summary from shared/src/caseSummary.ts (verdict, farm section, GPS with accuracy, decision, recent rain from NASA POWER, model version; text only, no photos) via mobile/src/screens/sendCaseToOfficer.ts; 'Call your field officer' and 'Call KALRO farm research' buttons in mobile/src/screens/OfficerActions.tsx; labels from mobile/src/i18n/strings.ts lines 169 and 278.",
      "Outbreak alerts (commit 275ca29): 3 farms in one area reporting one disease within 7 days builds a draft that an officer edits and approves before anything is sent (shared/src/neighbourAlerts.ts lines 21-22; backend/src/alertRoutes.ts).",
    ],
  ],
  [
    "Analysis computed for this video (videos/technical/analysis)",
    [
      "chroma.py: CIELAB colour of 1,462 BRACOL symptom crops from the train split (one mean point per crop, the dot cloud on screen), and a colour-only logistic regression on CIELAB histograms, trained on 9,488 train images and scored on 2,839 validation images of five classes present on this machine (Peru and reviewed BRACOL crops were not on disk): 61.6% accuracy.",
      "saliency.py: the published B2 model from https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 (revision 31a46d723399aa5bb6305e5a9d1d50a74936f74c), downloaded outside the repository. Its model.safetensors SHA256 is eb6a5d4d... and its model.tflite SHA256 is ddbea876..., identical to the README's selected B2 checkpoint and to the app export in mobile/assets/model/model-config-b2.json; the rebuilt PyTorch model has 7,712,266 parameters. Ten held-out whole-leaf BRACOL test photos, two per class drawn with a fixed seed (no selection by result), were run through the TFLite export with the app's preprocessing; the label and calibrated score under each tile are its output (scores truncated to two decimals), and the ring is the app's confidence state from model-config-b2.json thresholds (one phoma leaf at 0.955 is 'possible' because phoma needs 0.96 to be 'confident'). The light on each leaf is LayerCAM on MBConv stage 6 of the same weights, for the predicted class. In this cut only one of these leaves appears, as the input of the network diagram (a held-out rust leaf the export scores 0.97).",
      "gradcam.py: the B2 PyTorch checkpoint (training/checkpoints/efficientnet_b2/best.safetensors) scores 92.85% on the same 2,839 validation images; real per-stage activation maps for the network diagram; the lesion photos and the LayerCAM rust crop in the biology shot are its held-out crops (LayerCAM on MBConv stage 6). The top-left 7x7 cell, which every deep layer lights regardless of the image (a padding artifact), is zeroed before normalising. These are PyTorch checkpoint scores, not the INT8 TFLite export.",
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
    "Biology sources",
    [
      "Carvalho et al. 2011, Cryptosexuality and the Genetic Diversity Paradox in Coffee Rust, Hemileia vastatrix, PLoS ONE 6(11):e26387 (carotenoid lipid guttules give urediniospores their yellow-orange colour). https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0026387",
      "Talhinhas et al. 2017, The coffee leaf rust pathogen Hemileia vastatrix, Molecular Plant Pathology (chlorotic spots first; orange uredinia on the lower leaf surface). https://pmc.ncbi.nlm.nih.gov/articles/PMC6638270/",
      "Nelson S.C. 2008, Cercospora Leaf Spot and Berry Blotch of Coffee, University of Hawaii CTAHR PD-41 (grey-white centre, brown ring, yellow halo). https://www3.ctahr.hawaii.edu/oc/freepubs/pdf/PD-41.pdf",
      "Dantas et al. 2021, A Comprehensive Review of the Coffee Leaf Miner Leucoptera coffeella, Insects (larvae feed on the palisade parenchyma; mines cause necrosis). https://pmc.ncbi.nlm.nih.gov/articles/PMC8707027/",
      "Pereira and Reis 2024, Phoma spot or ascochyta spot of coffee, Revista Cultivar (dark spots; cold winds; altitude above 900 m). https://revistacultivar.com/articles/phoma-spot-or-ascochyta-spot-of-coffee",
      "Jiao, Meng and Lv 2020, Roles of stay-green homologs during chlorophyll degradation, Botanical Studies (leaves turn yellow as chlorophyll breaks down). https://pmc.ncbi.nlm.nih.gov/articles/PMC7511501/",
      "Depetris, Dimech and Guthridge 2025, Plants (CIELAB a* as a greenness measure). https://pmc.ncbi.nlm.nih.gov/articles/PMC12115340",
      "Geirhos et al. 2019, ImageNet-trained CNNs are biased towards texture, ICLR. https://arxiv.org/abs/1811.12231",
      "Jiang, Zhang, Hou, Cheng and Wei 2021, LayerCAM: Exploring Hierarchical Class Activation Maps for Localization, IEEE Transactions on Image Processing. https://mmcheng.net/layercam/",
      "Selvaraju et al. 2017, Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization. https://arxiv.org/abs/1610.02391",
    ],
  ],
  [
    "Pictures, footage and 3D",
    [
      "Hemileia vastatrix urediniospores (panel E): Carvalho et al. 2011, PLoS ONE, CC BY 2.5. https://commons.wikimedia.org/wiki/File:Hemileia_vastatrix.png (cropped).",
      "OpenAI symbol: https://commons.wikimedia.org/wiki/File:OpenAI_logo_2025_(symbol).svg, public domain (text and simple shapes); a trademark of OpenAI, used only to label the benchmark comparison. No endorsement by OpenAI is implied.",
      "Noor's basic phone, the hub phone, the network diagram and the officer screens are drawn in code for this video.",
      "Leaf crops in the biology, architecture and LayerCAM shots: BRACOL dataset images (CC BY 4.0), shown as the 224-pixel crop the network sees.",
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
