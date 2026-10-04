// Fails if any checked frame of the rendered demo video shows more than 10 readable words.
// It takes every 3rd frame of out/DemoVideo.mp4, reads it with Apple's Vision OCR (scripts/ocrWords.swift) and counts
// words, where a word is any whitespace-separated token with a letter or digit, so numbers count too.
// Keypad legends and the real app's own UI are product, not text the video adds, so before reading a frame the checker
// blacks out the boxes scripts/writeMasks.ts computed for that frame (out/keypad-masks.json): the basic phone's keypad
// and the iPhone screen while it plays a recording or capture of the app. Nothing else is masked: the basic phone's
// LCD, tags, numbers, the motif marks and every caption count.
// Usage: node scripts/writeMasks.ts && node scripts/checkWords.ts [video] [every]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_WORDS = 10;
const BATCH = 60;

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../out");
const video = resolve(process.argv[2] ?? resolve(out, "DemoVideo.mp4"));
const every = Number(process.argv[3] ?? 3);
const framesDir = resolve(out, "ocr-frames");
const ocrBinary = resolve(out, "ocrWords");

type Reading = { frame: number; words: number; text: string };

function compileOcr() {
  if (existsSync(ocrBinary)) return;
  execFileSync("swiftc", ["-O", resolve(here, "ocrWords.swift"), "-o", ocrBinary], { stdio: "inherit" });
}

function extractFrames() {
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `select=not(mod(n\\,${every}))`, "-fps_mode", "vfr", "-q:v", "2", resolve(framesDir, "f_%05d.jpg")]);
  return readdirSync(framesDir).filter((name) => name.endsWith(".jpg")).sort();
}

/** Blacks out the keypad legends on every extracted frame that has a mask. Frame files are numbered from 1. */
function maskKeypads(files: string[]) {
  const masks = JSON.parse(readFileSync(resolve(out, "keypad-masks.json"), "utf8")) as Record<string, number[][]>;
  const jobs = files
    .map((name) => ({ path: resolve(framesDir, name), frame: (Number(name.match(/f_(\d+)\.jpg$/)?.[1] ?? 1) - 1) * every }))
    .filter((job) => masks[job.frame])
    .map((job) => ({ path: job.path, box: masks[job.frame] }));
  const painter = "import json,sys\nfrom PIL import Image, ImageDraw\nfor job in json.load(sys.stdin):\n  im=Image.open(job['path']); d=ImageDraw.Draw(im)\n  for x,y,w,h in job['box']: d.rectangle([x,y,x+w,y+h],fill='black')\n  im.save(job['path'],quality=92)\n";
  execFileSync("python3", ["-c", painter], { input: JSON.stringify(jobs) });
  return jobs.length;
}

function readBatch(files: string[]): Reading[] {
  const run = spawnSync(ocrBinary, files.map((name) => resolve(framesDir, name)), { maxBuffer: 64 * 1024 * 1024 });
  return run.stdout
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [path, count, text = ""] = line.split("\t");
      const index = Number(path.match(/f_(\d+)\.jpg$/)?.[1] ?? 0);
      return { frame: (index - 1) * every, words: Number(count), text };
    });
}

function main() {
  compileOcr();
  const files = extractFrames();
  console.log(`masked keypad or app screen on ${maskKeypads(files)} frames`);
  const readings: Reading[] = [];
  for (let start = 0; start < files.length; start += BATCH) readings.push(...readBatch(files.slice(start, start + BATCH)));
  writeFileSync(resolve(out, "word-count.tsv"), readings.map((reading) => `${reading.frame}\t${reading.words}\t${reading.text}`).join("\n") + "\n");
  const worst = readings.reduce((max, reading) => (reading.words > max.words ? reading : max), { frame: -1, words: 0, text: "" });
  const over = readings.filter((reading) => reading.words > MAX_WORDS);
  console.log(`checked ${readings.length} frames (every ${every}), max ${worst.words} words at frame ${worst.frame}: ${worst.text}`);
  over.forEach((reading) => console.log(`OVER frame ${reading.frame}: ${reading.words} words: ${reading.text}`));
  rmSync(framesDir, { recursive: true, force: true });
  if (over.length > 0) process.exit(1);
}

main();
