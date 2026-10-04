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
      "Kenya's target of one extension officer per 600 farmers by 2029: Kenya Agricultural Sector Extension Policy, December 2023, page 8. https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf (docs/research-sources.md line 21).",
      "Training rows per source (CoffeeLeaf-CO 8,309; BRACOL 7,513; AGML 1,278; Peru 1,105; RoCoLe 1,072; Makerere beans 1,034) and the 20,311 / 5,294 / 5,868 split: training/manifests/scale_v3_manifest.json; README.md line 288.",
      "Groups: 3,624 train, 884 validation and 982 test groups (5,490 in all; 6,259 with the evaluation-only external collections), none in more than one split. Counted by us from the 'group' field of scale_v3_manifest.json. The README's 6,174 groups refers to the earlier 23,552-image manifest (README.md line 226).",
      "EfficientNet-B2: 7,712,266 parameters (README.md line 314); phase 2 trains blocks.5, blocks.6, conv_head, bn2 and the classifier (training/b1_train.py line 321; training/checkpoints/efficientnet_b2/training.json recipe). Stage grids and channels come from the checkpoint (videos/technical/public/analysis/gradcam.json).",
      "Held-out accuracy B0 86.79%, B1 93.27%, B2 94.09%, B3 93.22%; macro F1 0.761 / 0.872; non-coffee accepted 38/202 / 0/202; smaller-leaf macro F1 0.568 / 0.844; accuracy on accepted 88.09% / 95.14%; export 8.57 MB; B3 over the 10 MB limit: README.md lines 351-369 and training/reports/model_comparison_b3/comparison.json.",
      "About 98 ms per photo: training/reports/model_comparison_b3/single_image_timing.json, B2 total_response mean 98.05 ms, 4 CPU threads on a desktop AMD CPU; physical_phone_benchmarked: false.",
      "INT8 weight storage with float32 compute: mobile/assets/model/model-config-b2.json runtime; 0 network calls: README.md line 330.",
      "External rust scans, 1,119 images: B2 AUROC 0.778 (README.md line 360). GPT-6 Astra AUROC 0.776 and both run times (1 min 45 s, 58 min 39 s) are the team's own benchmark and are not recorded in the repository. AUROC measures ranking, not diagnosis accuracy.",
      "Six-leaf vote: 3 agreeing leaves and 60% of clear leaves (shared/src/plantVote.ts lines 4-6). The six-leaf example on screen is illustrative.",
      "buildActionCard in shared/src/actionCard.ts; the officer case summary text is from docs/screens/08-sms-opens-with-case-summary.png.",
      "Hub model Qwen3.5-2B, 1.28 GB without the vision file (shared/src/localModel/modelCatalog.ts lines 58-62); 84 of 94 fields and 0 wrong final diagnoses on 24 synthetic messages (README.md lines 526-528). The Swahili message and its expected fields are eval case shared/src/localModel/evalCases.ts line 17. The confirm-first reply is SWAHILI_WORDING.confirmFirst in shared/src/smsReply.ts with the rust name from shared/src/diseases.sw.ts, shortened with an ellipsis.",
      "Kikuyu guard: 1,010 of 1,012 FLORES-200 devtest Kikuyu sentences flagged, 0 of 1,012 Swahili or English (docs/evidence.md lines 97-103, evals/kikuyu/results.json).",
      "Seed check: KEPHIS short code 1393 (shared/src/contacts.ts line 32); SEED/MBEGU keywords (shared/src/seedCheck.ts line 9); the barcode outcomes genuine, recalled and unknown come from the demo registry in mobile/src/screens/seedBarcode.ts (commit 7cbc90c), not live KEPHIS data.",
      "Hotspots: 25 m grouping, rechecks within 30 min and 15 m counted once (shared/src/hotspots.ts lines 5-8); 8-week trend (mobile/src/hotspots/useHotspotView.ts line 16). The map sightings and weekly counts on screen are simulated.",
      "Neighbour alerts (commit 275ca29): 3 farms in one area reporting one disease within 7 days builds a draft; the officer approves before anything is sent (shared/src/neighbourAlerts.ts lines 21-22 and 118; footer line 26).",
    ],
  ],
  [
    "Analysis computed for this video (videos/technical/analysis)",
    [
      "chroma.py: CIELAB colour of 1,462 BRACOL symptom crops from the train split (median a* and b* per class, one mean point per crop), and a colour-only logistic regression on CIELAB histograms, trained on 9,488 train images and scored on 2,839 validation images of five classes present on this machine (Peru and reviewed BRACOL crops were not on disk): 61.6% accuracy.",
      "saliency.py: the published B2 model from https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 (revision 31a46d723399aa5bb6305e5a9d1d50a74936f74c), downloaded outside the repository. Its model.safetensors SHA256 is eb6a5d4d... and its model.tflite SHA256 is ddbea876..., identical to the README's selected B2 checkpoint and to the app export in mobile/assets/model/model-config-b2.json; the rebuilt PyTorch model has 7,712,266 parameters. Ten held-out whole-leaf BRACOL test photos, two per class drawn with a fixed seed (no selection by result), were run through the TFLite export with the app's preprocessing; the label and calibrated score under each tile are its output (scores truncated to two decimals), and the ring is the app's confidence state from model-config-b2.json thresholds (one phoma leaf at 0.955 is 'possible' because phoma needs 0.96 to be 'confident'). The light on each leaf is LayerCAM on MBConv stage 6 of the same weights, for the predicted class.",
      "gradcam.py: the B2 PyTorch checkpoint (training/checkpoints/efficientnet_b2/best.safetensors) scores 92.85% on the same 2,839 validation images; real per-stage activation maps for the architecture diagram; the lesion photos in the biology shot are its held-out crops. The top-left 7x7 cell, which every deep layer lights regardless of the image (a padding artifact), is zeroed before normalising. These are PyTorch checkpoint scores, not the INT8 TFLite export.",
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
      "Earth at night: rendered in Blender by scripts/blender/earth.py (a landscape copy of reels/scripts/blender/earth.py) from NASA Blue Marble Next Generation December 2004 (Visible Earth 74518), Black Marble 2016 (144898) and Blue Marble clouds (57747). Public domain (NASA).",
      "Coffee rust on a leaf underside, NW Rwanda: Smartse, CC BY-SA 3.0. https://commons.wikimedia.org/wiki/File:Hemileia_vastatrix_-_coffee_leaf_rust.jpg (cropped).",
      "Hemileia vastatrix urediniospores and pustules (panels C, D and E): Carvalho et al. 2011, PLoS ONE, CC BY 2.5. https://commons.wikimedia.org/wiki/File:Hemileia_vastatrix.png (cropped).",
      "Leaf crops in the biology, architecture and LayerCAM shots: BRACOL dataset images (CC BY 4.0), shown as the 224-pixel crop the network sees.",
      "Leaf Doctor B2 model card and weights: https://huggingface.co/ConnorLee08/coffee-leaf-efficientnet-b2 (the team's model; weights not committed here).",
      "App screen recordings: the team's iPhone recordings of Leaf Doctor (leaf scan and seed check) and of an iMessage conversation with the Leaf Doctor bot, 3 October 2026. Ours.",
      "Icons: Phosphor Icons, MIT.",
    ],
  ],
  [
    "Sound",
    [
      `Voice: ElevenLabs, ${VOICE.name}, voice id ${VOICE.id}, model ${VOICE.model}. The user's professional clone "Me" (5axmWqaBh99l1FM1cHKM) was tried first and returned voice_not_fine_tuned, so the instant clone was used. Licence: ElevenLabs terms of service.`,
      `Music: generated with the ElevenLabs Music API (music_v1, 58.5 s, instrumental) for this video. Prompt: "${MUSIC_PROMPT}". Ducked under the voice; the mix is mastered to -14 LUFS. Licence: ElevenLabs terms of service.`,
      "Sound effects: synthesised by scripts/sound.py (copied from reels/). Ours.",
    ],
  ],
  [
    "Notes",
    [
      "Noor is the fictional farmer from the hackathon brief. No people appear in this video.",
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
