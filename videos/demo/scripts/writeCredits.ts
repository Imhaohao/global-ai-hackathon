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
  "38 of 100 farmers swap to a basic phone: 38.4% of rural Kenyan adults (15+) say their main phone is a basic text phone, 2024 survey. World Bank, Global Findex, con9b rural. https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?format=json&source=28 (docs/evidence.md)",
  "66 of 100 farmers lose their signal bars: 33.7% of rural Kenyan adults (15+) use the internet daily, 2024 survey, so about 66 in 100 do not. World Bank, Global Findex, con26d rural (Daily internet use, rural), fetched 2026-10-04. https://api.worldbank.org/v2/country/KEN/indicator/con26d.9?format=json&source=28 (not in docs/evidence.md; recorded here)",
  "1 : 600, Kenya's 2029 target ratio of extension officers to farmers; the policy says the ratio has not improved, so each adviser covers hundreds of farmers. Kenya Agricultural Sector Extension Policy, December 2023. https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf",
  "160-character texts: replies are converted to plain GSM-safe text and capped at 459 characters, three standard SMS segments (shared/src/smsReply.ts, SMS_MAX_CHARS); the hub phone answers on the device when offline (hub/, README).",
  "8.57 MB: the EfficientNet-B2 leaf model export, 8,573,416 bytes (README.md, 'EfficientNet-B2 experiment'). It runs on the phone offline; the default bundled B0 model is 8.09 MB.",
  "1393: text the KEPHIS scratch code to 1393 (shared/src/seedCheck.ts, mobile/src/screens/SeedCheckScreen.tsx). The video never shows a code or its length.",
  "Three farms with one disease in a week draft an alert that an officer sends or dismisses: shared/src/neighbourAlerts.ts and backend/src/officerPage.ts (commit 275ca29). The officer page is shown with demo data, tagged 'Demo data'.",
  "SHOP: the bot's replies from shared/src/remedyFinder.ts (commit 4ef8721); the shop name and number are the test fixture from shared/src/remedyFinder.test.ts, tagged 'Demo data'.",
  "Field officer contact: 'Send to field officer' texts the case summary from shared/src/caseSummary.ts (result, location, rain); 'Call' dials the saved officer or KALRO (shared/src/contacts.ts).",
];

const SCREENS = [
  ...RECORDINGS.map((recording) => `${recording.what}. The team's real screen recording, ${recording.source}. Licence: ours.`),
  `${TRANSCRIBED.what}: ${TRANSCRIBED.source}. Licence: ours.`,
  "'The app is not sure' card with Send to field officer and Call KALRO: captured from the Leaf Doctor iOS build in the iOS Simulator. Licence: ours.",
  "Area alerts page: backend/src/officerPage.ts rendered in headless Chrome with one demo alert (Karima, coffee leaf rust, 3 farms). Licence: ours.",
];

const PICTURES = [
  ...FOOTAGE.map((clip) => `Video, "${clip.title}" by ${clip.author}. ${clip.page} Licence: ${clip.licence}.`),
  ...PHOTOS.map((photo) => `Photo, "${photo.title}" by ${photo.author}, Wikimedia Commons. ${photo.page} Licence: ${photo.licence}. Shown as Noor's field officer; he is a real extension worker photographed in Africa, not a person in our project.`),
  "Noor's basic phone, the hub phone, the seed packet, the 100-farmer grid (videos/shared/FarmerGrid.tsx) and the SMS route: drawn in code for this video. Licence: ours. No generated images and no generated people.",
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
