// The narration, one line per beat. `text` is what ElevenLabs speaks, respelled where the voice misreads a term.
export const VOICE = { id: "5axmWqaBh99l1FM1cHKM", name: "Me (the user's professional voice clone)", model: "eleven_multilingual_v2" };

export type Line = { beat: string; text: string; seed: number };

export const SCRIPT: Line[] = [
  { beat: "problem", seed: 11, text: "In rural Kenya, thirty-eight of every hundred adults use a basic text phone. Sixty-six aren't online daily, and extension officers are few." },
  { beat: "hub", seed: 12, text: "So Noor sends a text. A hub phone at her cooperative answers offline. A small Kwen model turns her Swahili into fields, rules match the disease, and it asks her to confirm." },
  { beat: "scan", seed: 13, text: "At the weekend, her daughter's phone scans leaves offline, with a model fine-tuned on twenty thousand leaves, split by plant so the test stays honest." },
  { beat: "biology", seed: 14, text: "Rust spores are orange, and dead tissue turns brown. Colour alone scores sixty-two percent. Add texture, and it scores ninety-three." },
  { beat: "race", seed: 15, text: "On eleven hundred outside rust photos, it finishes thirty-three times faster than GPT-6 Astra, and ranks them just as well." },
  { beat: "officer", seed: 16, text: "When it's unsure, one tap drafts a case summary text to her field officer, or calls. Officers approve every outbreak alert." },
  { beat: "close", seed: 17, text: "Now every farmer can be reached. Leaf Doctor." },
];
