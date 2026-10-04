// Writes out/DemoVideo-credits.txt: every figure on screen with its source, every clip, photo and screen, and the sound.
// Usage: node scripts/writeCredits.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTAGE, RECORDINGS } from "../src/sources.ts";
import { SCRIPT, VOICE } from "../src/voiceover.ts";
import { MUSIC_PROMPT } from "./musicPrompt.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../out/DemoVideo-credits.txt");

const FIGURES = [
  "1 in 3 rural Kenyans live without electricity: 67.1% of Kenya's rural population had access to electricity in 2024. World Bank, World Development Indicators, EG.ELC.ACCS.RU.ZS. https://api.worldbank.org/v2/country/KEN/indicator/EG.ELC.ACCS.RU.ZS?format=json&mrnev=1 (docs/evidence.md)",
  "38% of rural Kenyan adults use a basic phone as their main phone: 38.4%, rural adults aged 15+, 2024 survey. World Bank, Global Findex (con9b, rural). https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?format=json&source=28 (docs/evidence.md). Narrated as 'nearly four in ten'.",
  "1 : 600 target extension officer to farmer ratio for 2029, and 'the ratio has not improved'. Kenya Agricultural Sector Extension Policy, December 2023. https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf",
  "20,311 coffee-leaf training photos: the vetted training split (AGML, BRACOL including reviewed crops, RoCoLe, CoffeeLeaf-CO, Peru). README.md, 'EfficientNet-B2 experiment'; training/sources.json. World Bank data is evidence for the problem, not training data.",
  "Runs on the phone with no signal: the leaf model is bundled in the app and classifies offline (README.md). Speed on a physical phone is not yet measured.",
  "40%+ of retail maize seed packets tested in a Kenyan study were problematic. J-PAL evaluation, 'Consumer information to reduce counterfeit agricultural goods in Kenya'. https://www.povertyactionlab.org/evaluation/consumer-information-reduce-counterfeit-agricultural-goods-kenya (docs/research-sources.md, status Checked). This is maize in Kenya, not coffee and not Africa-wide.",
  "Text the KEPHIS code to 1393: shared/src/seedCheck.ts and mobile/src/screens/SeedCheckScreen.tsx. The barcode scan in the recording looks up a demo registry (commit 7cbc90c) and is labelled as such on screen.",
  "Checks within 25 m merge into one circle: HOTSPOT_LINK_METERS in shared/src/hotspots.ts. The map's sightings are the app's labelled simulated sightings (mobile/src/hotspots/simulatedObservations.ts), labelled on screen.",
  "Three farms with one disease in a week draft an alert, which an officer edits and sends or dismisses: OUTBREAK_MIN_FARMS and OUTBREAK_WINDOW_MS in shared/src/neighbourAlerts.ts and backend/src/officerPage.ts (commit 275ca29). The page is shown with demo data, labelled on screen.",
  "3 wet days in 7 before spray advice, rain under 3 days old from CHIRPS or NASA POWER: sprayFromWetDays in shared/src/actionCard.ts and MAX_RAIN_AGE_MS in shared/src/wetDays.ts (commit 768c7d5). The rule applies to coffee leaf rust.",
  "SHOP replies: formatted by shared/src/remedyFinder.ts (commit 4ef8721). The three shop names and numbers are the test fixtures from shared/src/remedyFinder.test.ts, labelled 'test data' on screen; the live bot fills them from Google Places.",
];

const SCREENS = [
  ...RECORDINGS.map((recording) => `${recording.what}. The team's real screen recording, ${recording.source}. Licence: ours.`),
  "Farm hotspot map and the 'The app is not sure' card: captured from the Leaf Doctor iOS build (org.hacknation.leafdoctor) in the iOS Simulator on 2026-10-04, with the app's own simulated sightings loaded. Licence: ours.",
  "Area alerts page: backend/src/officerPage.ts rendered in headless Chrome with one demo alert (Karima, coffee leaf rust, 3 farms) drafted by shared/src/neighbourAlerts.ts. Licence: ours.",
  "SHOP thread: iMessage header and keyboard cropped from ScreenRecording 22-52-31; the bubbles carry the bot's real reply strings. Licence: ours.",
];

const PICTURES = [
  ...FOOTAGE.map((clip) => `Video, "${clip.title}" by ${clip.author}. ${clip.page} Licence: ${clip.licence}. Used ${clip.seconds} s from ${clip.trimStart} s.`),
  "Earth at night: built and rendered in Blender by scripts/blender/earth.py from NASA Blue Marble Next Generation (December 2004, visibleearth.nasa.gov/images/74518), Black Marble 2016 (visibleearth.nasa.gov/images/144898) and Blue Marble clouds (visibleearth.nasa.gov/images/57747). Licence: public domain (NASA).",
  "Phone body, tap ripples, kinetic type and the rain-week graphic: drawn in code for this video. Licence: ours. No generated images and no generated or illustrated people are used.",
];

const SOUND = [
  `Voice: ElevenLabs, ${VOICE.name} (${VOICE.id}), ${VOICE.model}. This is the user's own instant voice clone. The user's professional clone "Me" (5axmWqaBh99l1FM1cHKM) was tried first; the API refused it because it is not fine-tuned yet.`,
  `Music: generated with the ElevenLabs Music API (POST /v1/music, model music_v1, 57 s, instrumental) for this video. Prompt: "${MUSIC_PROMPT}" Laid in three bar-aligned pieces and ducked to 40% under the voice. Licence: ElevenLabs terms of service.`,
  "Sound effects (whoosh, key click, SMS chirp, scan sweep, shutter, hit): synthesised by scripts/sound.py. Licence: ours.",
];

const text = [
  "Leaf Doctor: demo video credits and sources",
  "",
  "Narration",
  ...SCRIPT.map((line) => `- ${line.text}`),
  "",
  "Figures on screen",
  ...FIGURES.map((line) => `- ${line}`),
  "",
  "App screens",
  ...SCREENS.map((line) => `- ${line}`),
  "",
  "Footage and pictures",
  ...PICTURES.map((line) => `- ${line}`),
  "",
  "Sound",
  ...SOUND.map((line) => `- ${line}`),
  "",
  "Notes",
  "- Noor is the fictional farmer from the hackathon brief. No real person appears in this video.",
  "- This is a research prototype. Field accuracy and physical-phone speed are not measured yet, and no yield benefit is claimed.",
  "- Hack-Nation x World Bank 'Small AI for Development' submission. No World Bank partnership or endorsement is implied.",
  "",
].join("\n");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`wrote ${out}`);
