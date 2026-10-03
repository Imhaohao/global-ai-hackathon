// Speaks each script line with ElevenLabs, one file per beat, and keeps the word timings for the captions.
// Usage: node scripts/generateVoice.ts [beat ...]   (no beats = all). Needs ELEVENLABS_API_KEY in the environment.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT, VOICE } from "../src/reels/demo/voiceover.ts";

type Alignment = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
type Word = { text: string; start: number; end: number };

const here = dirname(fileURLToPath(import.meta.url));
const audioDir = resolve(here, "../public/audio/voice");
const timingsFile = resolve(here, "../src/reels/demo/voiceTimings.json");
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("Set ELEVENLABS_API_KEY");

const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.06 };

function wordsFrom(alignment: Alignment): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;
  alignment.characters.forEach((character, index) => {
    if (/\s/.test(character)) {
      current = null;
      return;
    }
    if (!current) {
      current = { text: "", start: alignment.character_start_times_seconds[index], end: 0 };
      words.push(current);
    }
    current.text += character;
    current.end = alignment.character_end_times_seconds[index];
  });
  return words;
}

function audioSeconds(file: string): number {
  const output = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return Number(output.trim());
}

const VOICE_LOUDNESS = "I=-15:TP=-1.5:LRA=7";

/** Brings a clip to a common loudness so the voice sits at the same level in every beat and above the music. */
function normalise(file: string) {
  const temporary = file.replace(/\.mp3$/, ".normalising.mp3");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-af", `loudnorm=${VOICE_LOUDNESS}`, "-ar", "44100", "-b:a", "160k", temporary]);
  renameSync(temporary, file);
}

/** Where the voice stops: the start of the silence that runs to the end of the file, so the next beat can begin there. */
function speechEndSeconds(file: string): number {
  const seconds = audioSeconds(file);
  const run = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-40dB:d=0.12", "-f", "null", "-"]);
  return trailingSilenceStart(run.stderr.toString(), seconds);
}

function trailingSilenceStart(report: string, seconds: number): number {
  const starts = [...report.matchAll(/silence_start: ([\d.]+)/g)].map((match) => Number(match[1]));
  const ends = [...report.matchAll(/silence_end: ([\d.]+)/g)].map((match) => Number(match[1]));
  const lastStart = starts.at(-1);
  const lastEnd = ends.at(-1) ?? seconds;
  const silenceReachesEnd = ends.length < starts.length || lastEnd >= seconds - 0.15;
  return lastStart !== undefined && silenceReachesEnd ? lastStart : seconds;
}

async function speak(index: number) {
  const line = SCRIPT[index];
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey!, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: line.text,
      model_id: VOICE.model,
      voice_settings: VOICE_SETTINGS,
      previous_text: SCRIPT[index - 1]?.text,
      next_text: SCRIPT[index + 1]?.text,
      seed: line.seed,
    }),
  });
  if (!response.ok) throw new Error(`${line.beat}: ElevenLabs answered ${response.status} ${await response.text()}`);
  const payload = (await response.json()) as { audio_base64: string; alignment: Alignment };
  const file = resolve(audioDir, `${line.beat}.mp3`);
  writeFileSync(file, Buffer.from(payload.audio_base64, "base64"));
  normalise(file);
  return { beat: line.beat, seconds: audioSeconds(file), speechEnd: 0, words: wordsFrom(payload.alignment) };
}

mkdirSync(audioDir, { recursive: true });
const requested = new Set(process.argv.slice(2));
type Timing = { beat: string; seconds: number; speechEnd: number; words: Word[] };
const previous = existsSync(timingsFile) ? (JSON.parse(readFileSync(timingsFile, "utf8")) as Timing[]) : [];
const timings: Timing[] = [];
for (const [index, line] of SCRIPT.entries()) {
  const keep = requested.size > 0 && !requested.has(line.beat) ? previous.find((entry) => entry.beat === line.beat) : undefined;
  const entry = keep ?? (await speak(index));
  timings.push({ ...entry, speechEnd: speechEndSeconds(resolve(audioDir, `${line.beat}.mp3`)) });
  console.log(line.beat, entry.seconds, keep ? "kept" : "new");
}
writeFileSync(timingsFile, `${JSON.stringify(timings, null, 2)}\n`);
