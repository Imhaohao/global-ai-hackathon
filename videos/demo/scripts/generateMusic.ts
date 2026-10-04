// Composes the music bed with the ElevenLabs Music API. Usage: node scripts/generateMusic.ts  Needs ELEVENLABS_API_KEY.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUSIC_PROMPT } from "./musicPrompt.ts";

const here = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY");

const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192", {
  method: "POST",
  headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: MUSIC_PROMPT, music_length_ms: 57000, model_id: "music_v1", force_instrumental: true }),
});
if (!response.ok) throw new Error(`ElevenLabs music answered ${response.status} ${await response.text()}`);
writeFileSync(resolve(here, "../public/audio/music.mp3"), Buffer.from(await response.arrayBuffer()));
console.log("wrote public/audio/music.mp3");
