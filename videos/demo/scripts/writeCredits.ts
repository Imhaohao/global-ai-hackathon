// Writes out/DemoVideo-credits.txt: every figure on screen with its source, every clip, photo and screen, and the sound.
// Usage: node scripts/writeCredits.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTAGE, PHOTOS, RECORDINGS, TRANSCRIBED } from "../src/sources.ts";
import { SCRIPT, VOICE } from "../src/voiceover.ts";
import { MUSIC_PROMPT } from "./musicPrompt.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../out/DemoVideo-credits.txt");

const FIGURES = [
  "66 of 100 farmers without daily internet: 33.7% of rural Kenyan adults (15+) use the internet daily, 2024 survey, so about 66 in 100 do not. World Bank, Global Findex, con26d rural. https://api.worldbank.org/v2/country/KEN/indicator/con26d.9?format=json&source=28 (fetched 2026-10-04; not in docs/evidence.md)",
  "38 of 100 on a basic phone: 38.4% of rural Kenyan adults (15+) say their main phone is a basic text phone, 2024 survey. World Bank, Global Findex, con9b rural. https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?format=json&source=28 (docs/evidence.md)",
  "1 : 600, Kenya's 2029 target ratio of extension officers to farmers; the policy says the ratio has not improved. Kenya Agricultural Sector Extension Policy, December 2023. https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf",
  "Airplane mode and zero internet: the seed recording (22-33-02) was made in airplane mode, shown by its status bar and Control Center. The leaf model runs on the phone with no network (README: the fresh-process verifier blocked outgoing sockets and saw zero connection attempts). The leaf scan recording itself had Wi-Fi on and is not labelled as airplane mode.",
  "No internet, no data, just a text: SMS carries no mobile data; the hub phone answers offline with on-device rules (hub/, README).",
  "1393: text the KEPHIS scratch code to 1393 (shared/src/seedCheck.ts). The barcode results come from a demo registry (commit 7cbc90c), tagged 'Demo registry'.",
  "SHOP: replies from shared/src/remedyFinder.ts (commit 4ef8721); the shop name and number are the test fixture from shared/src/remedyFinder.test.ts, tagged 'Demo data'.",
  "Send to field officer: texts the case summary from shared/src/caseSummary.ts to the saved cooperative officer.",
];

const SCREENS = [
  ...RECORDINGS.map((recording) => `${recording.what}. Source: ${recording.source}. Licence: ours.`),
  `${TRANSCRIBED.what}: ${TRANSCRIBED.source}. Licence: ours.`,
  "Control Center in the airplane-mode moment: redrawn in code to match the real iOS 26 Control Center at the end of ScreenRecording 22-33-02; the screen behind it is a frame of 22-23-18.",
];

const PICTURES = [
  ...FOOTAGE.map((clip) => `Video, "${clip.title}" by ${clip.author}. ${clip.page} Licence: ${clip.licence}.`),
  ...PHOTOS.map((photo) => `Photo, "${photo.title}" by ${photo.author}, Wikimedia Commons. ${photo.page} Licence: ${photo.licence}. Shown as the field officer; she is a real extension worker photographed in Kenya, not a person in our project.`),
  "Noor's basic phone, the iPhone frame, Control Center and the 100-farmer grid (videos/shared/FarmerGrid.tsx): drawn in code for this video. Licence: ours. No generated images and no generated people.",
];

const SOUND = [
  `Voice: ElevenLabs, ${VOICE.name} (${VOICE.id}), ${VOICE.model}. Chosen by the user from four samples.`,
  `Music: generated with the ElevenLabs Music API (POST /v1/music, model music_v1, 57 s, instrumental) for this video. Prompt: "${MUSIC_PROMPT}" Laid in three bar-aligned pieces and ducked under the voice. Licence: ElevenLabs terms of service.`,
  "Sound effects (whoosh, key click, SMS chirp, hit): synthesised by scripts/sound.py. Licence: ours.",
];

const section = (title: string, lines: readonly string[]) => [title, ...lines.map((line) => `- ${line}`), ""];

const text = [
  "Leaf Doctor: demo video credits and sources",
  "",
  ...section("Narration", SCRIPT.map((line) => `[${line.role}] ${line.text}`)),
  ...section("Figures on screen", FIGURES),
  ...section("App screens", SCREENS),
  ...section("Footage and pictures", PICTURES),
  ...section("Sound", SOUND),
  ...section("Type", ["Alegreya (Google Fonts, SIL Open Font License) for all display and body text; Atkinson Hyperlegible Mono only on the drawn phone's screen and key legends."]),
].join("\n");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`wrote ${out}`);
