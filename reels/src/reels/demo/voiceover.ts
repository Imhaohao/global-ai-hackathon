export const VOICE = {
  name: "Keith Muoki - Serious",
  id: "uLfPT2jUO3X81OwnftBP",
  source: "ElevenLabs shared voice library",
  description: "East African English with a mild Kenyan lilt, warm baritone, calm and measured",
  model: "eleven_multilingual_v2",
} as const;

export type BeatId = "gap" | "barriers" | "small" | "flip" | "photo" | "local" | "close";

/** seed is the ElevenLabs seed of the take we kept, so a line can be regenerated close to what is in the reel. */
export type ScriptLine = { beat: BeatId; text: string; seed: number };

export const SCRIPT: ScriptLine[] = [
  { beat: "gap", text: "The tools that can name a crop disease already exist, but they rarely reach a farmer like Noor on a Kenyan hillside.", seed: 101 },
  { beat: "barriers", text: "Her advice rarely comes in her language with a local person to call, and she often has no internet.", seed: 201 },
  { beat: "small", text: "So our leaf model is small enough to live on a phone. At seven point seven megabytes, it runs with no internet, while a cloud model needs data.", seed: 203 },
  { beat: "flip", text: "With a flip phone, she texts in Swahili to a hub phone at the local officer's station, and its own model answers with no signal.", seed: 104 },
  { beat: "photo", text: "A phone that sends pictures can send a leaf photo too, through our online backend.", seed: 105 },
  { beat: "local", text: "Replies use Swahili our team wrote and steps she can take with what she has, and unsure cases go to her extension officer.", seed: 106 },
  { beat: "close", text: "With Leaf Doctor, help that already exists reaches any phone, online or not.", seed: 303 },
];
