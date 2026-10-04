// Transcribes every voice line with ElevenLabs speech-to-text so misread terms show up as wrong words.
// Usage: node scripts/checkVoice.ts   (needs ELEVENLABS_API_KEY)
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT } from "../src/voiceover.ts";

const here = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY");

for (const line of SCRIPT) {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "en");
  form.append("file", new Blob([readFileSync(resolve(here, `../public/audio/voice/${line.beat}.mp3`))]), `${line.beat}.mp3`);
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": apiKey }, body: form });
  if (!response.ok) throw new Error(`${line.beat}: ${response.status} ${await response.text()}`);
  const payload = (await response.json()) as { text: string };
  console.log(`${line.beat}\n  sent:  ${line.text}\n  heard: ${payload.text}`);
}
