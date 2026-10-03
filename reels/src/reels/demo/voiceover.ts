export const VOICE = {
  name: "Keith Muoki - Serious",
  id: "uLfPT2jUO3X81OwnftBP",
  source: "ElevenLabs shared voice library",
  description: "East African English with a mild Kenyan lilt, warm baritone, calm and measured",
  model: "eleven_multilingual_v2",
} as const;

export type BeatId = "hook" | "problem" | "text" | "hub" | "scan" | "unsure" | "guardrail" | "scale" | "close";

/** seed is the ElevenLabs seed of the take we kept, so a line can be regenerated close to what is in the reel. */
export type ScriptLine = { beat: BeatId; text: string; seed: number };

export const SCRIPT: ScriptLine[] = [
  { beat: "hook", text: "These orange spots are coffee leaf rust, and rain carries it from tree to tree.", seed: 7 },
  { beat: "problem", text: "Noor grows coffee in Kenya, where nearly four in ten rural adults use a basic text phone, and extension officers are few.", seed: 22 },
  { beat: "text", text: "So she describes the spots in a Swahili text message to her cooperative.", seed: 13 },
  { beat: "hub", text: "The cooperative's phone answers, through Claude when it is online, or with a small model on the phone that asks her to confirm.", seed: 10 },
  { beat: "scan", text: "At the weekend, her daughter scans six leaves offline, and one card shows what it found, what to do now, who to call, and when to check again.", seed: 11 },
  { beat: "unsure", text: "If the leaves disagree, one tap sends the case to an extension officer.", seed: 12 },
  { beat: "guardrail", text: "Every Swahili reply comes from sentences our team wrote.", seed: 13 },
  { beat: "scale", text: "Next, reports that farmers choose to share could map rust across a cooperative.", seed: 14 },
  { beat: "close", text: "Leaf Doctor helps a farmer with any phone reach an answer, and a person, within a day.", seed: 39 },
];
