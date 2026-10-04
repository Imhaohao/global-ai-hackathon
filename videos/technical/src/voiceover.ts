// The narration, one line per beat. `text` is what ElevenLabs speaks, respelled where the voice misreads a term.
export const VOICE = { id: "2JkFC17m1Hj4OH1BDoIK", name: "Hao Voicemail Agent (the user's instant voice clone)", model: "eleven_multilingual_v2" };

export type Line = { beat: string; text: string; seed: number };

export const SCRIPT: Line[] = [
  { beat: "hook", seed: 11, text: "Kenya aims for one extension officer per six hundred farmers. Leaf Doctor puts a four-part system on the phone a farmer already has." },
  { beat: "data", seed: 12, text: "Part two is a small image network, EfficientNet Bee-two, fine-tuned on twenty thousand leaves split by plant, so none leak into the test." },
  { beat: "biology", seed: 13, text: "Rust spores carry orange carotenoids, and dead tissue turns brown. Colour alone scores sixty-two percent; with texture, Bee-two scores ninety-three." },
  { beat: "bench", seed: 14, text: "On held-out images it scores ninety-four percent, offline, in eight point six megabytes. Unsure results go to a person." },
  { beat: "sms", seed: 15, text: "Part three: one rule engine writes every reply. Offline, a small Kwen model turns Swahili into fields, then asks the farmer to confirm." },
  { beat: "seed", seed: 16, text: "Part one: text the seed packet's scratch code to one three nine three." },
  { beat: "hotspots", seed: 17, text: "Part four: sightings within twenty-five metres merge into hotspots, and an officer approves every alert." },
  { beat: "close", seed: 63, text: "The model can't see berry disease yet. Leaf Doctor." },
];
