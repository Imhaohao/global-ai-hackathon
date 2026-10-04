// The narration, one line per beat. `text` is what ElevenLabs speaks, respelled where the voice misreads a term.
export const VOICE = { id: "j9jfwdrw7BRfcR43Qohk", name: "Frederick Surrey - Smooth and Velvety", model: "eleven_multilingual_v2" };

export type Line = { beat: string; text: string; seed: number };

export const SCRIPT: Line[] = [
  { beat: "problem", seed: 33, text: "In rural Kenya, thirty-eight of every hundred adults use a basic text phone, sixty-six aren't online daily, and farm advisers are few." },
  { beat: "hub", seed: 12, text: "So Noor texts. Her cooperative's hub phone answers offline: a small Kwen model reads her Swahili, then asks her to confirm." },
  { beat: "tiny", seed: 13, text: "It works because it's small. Texts ride the SMS network, three messages at most. The hub's model is one point three gigabytes; the leaf model, eight and a half megabytes, in a sixty-eight megabyte app." },
  { beat: "scan", seed: 14, text: "At the weekend, her daughter's phone checks leaves offline. Twenty thousand labelled coffee leaves taught the model what each disease looks like, so it finds the rust and names it." },
  { beat: "race", seed: 15, text: "On eleven hundred rust photos, it's thirty-three times faster than GPT-6 Astra, and ranks them just as well." },
  { beat: "officer", seed: 16, text: "When it's unsure, one tap texts her field officer a case summary, or calls. Officers approve every outbreak alert." },
  { beat: "close", seed: 17, text: "With Leaf Doctor, let's re-leaf over-burdened specialists, and reach every single farmer in need." },
];
