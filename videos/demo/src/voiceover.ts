// The narration, one line per beat. Every figure here is sourced in out/DemoVideo-credits.txt.
export const VOICE = {
  // The user's professional clone "Me" (5axmWqaBh99l1FM1cHKM) is not fine-tuned yet and the API refuses it, so this is
  // the user's instant clone, the agreed fallback.
  name: "Hao Voicemail Agent (owner clone)",
  id: "2JkFC17m1Hj4OH1BDoIK",
  model: "eleven_multilingual_v2",
} as const;

export type BeatId = "access" | "phones" | "scan" | "sms" | "shop" | "seed" | "map" | "close";

export type ScriptLine = { beat: BeatId; text: string; spoken?: string; seed: number };

export const SCRIPT: ScriptLine[] = [
  { beat: "access", text: "In rural Kenya, a third of people live without electricity.", seed: 11 },
  { beat: "phones", text: "Nearly four in ten rely on a basic phone, and extension officers are few.", seed: 12 },
  {
    beat: "scan",
    text: "Meet Leaf Doctor. Skip the symptom chart: a model trained on twenty thousand coffee-leaf photos reads your leaf offline, then gives you steps and a day to recheck.",
    seed: 13,
  },
  { beat: "sms", text: "No smartphone? Text it. The advice comes back by SMS, follow-up questions included.", seed: 14 },
  { beat: "shop", text: "Reply SHOP with your town to find nearby agrovets, and what to ask for.", seed: 15 },
  {
    beat: "seed",
    text: "In a Kenyan study, over forty percent of maize seed packets tested were problematic. So check the KEPHIS code before you plant.",
    seed: 16,
  },
  {
    beat: "map",
    text: "Every check feeds a hotspot map. When three farms report the same disease in a week, an officer approves an alert for neighbours, and spray advice waits for a wet week.",
    seed: 17,
  },
  { beat: "close", text: "It fits Noor's morning walk. And when it isn't sure, it sends her to a person.", seed: 18 },
];
