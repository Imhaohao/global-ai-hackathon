// Transcribes every narration clip with ElevenLabs speech-to-text and checks that the hard words come back spelled right.
// Usage: node scripts/checkVoice.ts   Needs ELEVENLABS_API_KEY in the environment.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT } from "../src/voiceover.ts";

const here = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY");

const MUST_HEAR = ["Leaf Doctor", "KEPHIS", "SMS", "SHOP", "agrovets", "Noor", "coffee-leaf", "hotspot", "extension officers"];

async function transcribe(file: string): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", new Blob([readFileSync(file)], { type: "audio/mpeg" }), "clip.mp3");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": apiKey! }, body: form });
  if (!response.ok) throw new Error(`speech-to-text answered ${response.status} ${await response.text()}`);
  return ((await response.json()) as { text: string }).text;
}

// KEPHIS is said "KEF-iss" and agrovets "agro vets", so these phonetic spellings from the transcriber count as right.
const SOUNDS_LIKE: Record<string, string[]> = { KEPHIS: ["kephis", "kefis", "kefiss"], agrovets: ["agrovets", "agro vets", "agro-vets"] };

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function wasHeard(term: string, heard: string): boolean {
  const spellings = SOUNDS_LIKE[term] ?? [term];
  return spellings.some((spelling) => normalise(heard).includes(normalise(spelling)));
}

let failures = 0;
for (const line of SCRIPT) {
  const heard = await transcribe(resolve(here, `../public/audio/voice/${line.beat}.mp3`));
  const missing = MUST_HEAR.filter((term) => normalise(line.text).includes(normalise(term)) && !wasHeard(term, heard));
  failures += missing.length;
  console.log(`${line.beat}: ${missing.length ? `MISSING ${missing.join(", ")}` : "ok"}\n  heard: ${heard}`);
}
if (failures) process.exitCode = 1;
