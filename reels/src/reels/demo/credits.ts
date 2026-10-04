import photoCredits from "./photoCredits.json";
import { VOICE } from "./voiceover";

export type Credit = { what: string; who: string; licence: string; source?: string };

export const PHOTO_CREDITS: Credit[] = photoCredits.map((photo) => ({
  what: `Photo, ${photo.title.replace(/\.jpg$/i, "")}`,
  who: photo.author,
  licence: photo.licence,
  source: photo.source,
}));

/** Pictures of Noor, her daughter, the officer's desk and the officer are illustrations, not documentary photos. */
export const GENERATED_IMAGES = [
  "images/noor-slope.jpg",
  "images/noor-phone.jpg",
  "images/noor-reads.jpg",
  "images/daughter-scan.jpg",
  "images/cooperative-hub.jpg",
  "images/officer.jpg",
] as const;

export const GENERATED_CREDIT: Credit = {
  what: "Illustrations of Noor, her daughter, the officer's desk and the officer",
  who: "Generated with OpenAI image generation through Codex for this reel; Noor and her family are fictional",
  licence: "Generated image, no third-party licence",
};

export const STAGE_CREDIT: Credit = {
  what: "3D rust leaf in the opening shot",
  who: "The team's shared Blender stage (assets/stage), rendered vertically by scripts/blender/renderLeafPush.py",
  licence: "Ours",
};

export const SOUND_CREDITS: Credit[] = [
  { what: "Voice", who: `ElevenLabs, ${VOICE.name} (${VOICE.id}), ${VOICE.model}`, licence: "ElevenLabs terms of service" },
  { what: "Music", who: "Generated with the ElevenLabs Music API for this reel", licence: "ElevenLabs terms of service" },
  { what: "Sound effects", who: "Synthesised by scripts/sound.py", licence: "Ours" },
];

export type Source = { figure: string; source: string; year: string; url: string };

/** Every figure the reel shows, with where it came from and the year the data describes. */
export const SOURCES = {
  farmJobs: {
    figure: "45.8% of employment in Kenya is in agriculture",
    source: "World Bank, World Development Indicators (modelled ILO estimate)",
    year: "2025",
    url: "https://api.worldbank.org/v2/country/KEN/indicator/SL.AGR.EMPL.ZS?format=json&mrnev=1",
  },
  basicPhone: {
    figure: "38.4% of rural adults in Kenya say their main phone is a basic text phone",
    source: "World Bank, Global Findex",
    year: "2024 survey",
    url: "https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?format=json&source=28",
  },
  ownPhone: {
    figure: "91.5% of rural adults in Kenya own a mobile phone",
    source: "World Bank, Global Findex",
    year: "2024 survey",
    url: "https://api.worldbank.org/v2/country/KEN/indicator/con1.9?format=json&source=28",
  },
  ruralPower: {
    figure: "67.1% of Kenya's rural population has access to electricity",
    source: "World Bank, World Development Indicators",
    year: "2024",
    url: "https://api.worldbank.org/v2/country/KEN/indicator/EG.ELC.ACCS.RU.ZS?format=json&mrnev=1",
  },
  leafModelSize: {
    figure: "coffee-leaf.tflite is 8,091,596 bytes (7.72 MiB) and loads from the phone with no inference API",
    source: "Team model, README.md",
    year: "2026",
    url: "README.md",
  },
  extensionTarget: {
    figure: "Target of one extension officer per 600 farmers by 2029; the ratio has not improved",
    source: "Kenya Agricultural Sector Extension Policy, December 2023, page 8",
    year: "2023",
    url: "https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf",
  },
  hubModelTest: {
    figure: "On-device model filled 84 of 94 fields right with 0 wrong final diagnoses on 24 synthetic messages",
    source: "Team test, PROGRESS.md",
    year: "2026",
    url: "PROGRESS.md",
  },
  leafModelTest: {
    figure: "93.10% of accepted answers correct on a 4,571-image internal test; field accuracy not yet measured",
    source: "Team test, docs/build-plan.md",
    year: "2026",
    url: "docs/build-plan.md",
  },
} satisfies Record<string, Source>;
