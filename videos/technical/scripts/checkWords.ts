// Fails if any checked frame of the rendered reel shows more than 10 readable words.
// It takes every 3rd frame of out/Technical.mp4, reads it with Apple's Vision OCR (scripts/ocrWords.swift) and counts
// words, where a word is any whitespace-separated token with a letter or digit, so numbers count too.
// Usage: node scripts/checkWords.ts [video] [every]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_WORDS = 10;

/**
 * The 100-farmer grid is a pictogram: Vision reads its signal bars and phone-in-hand figures as "all", "lll" or "DФ".
 * Its box is blanked before OCR, only in the frames where the grid is on screen; every other pixel is still read.
 * Boxes come from src/scenes/Problem.tsx (GRID) and src/scenes/Close.tsx; frames from src/lib/timeline.ts.
 */
const PICTOGRAM_BOXES = [
  { from: 0, to: 253, x: 160, y: 120, width: 840, height: 840 },
  { from: 1656, to: 1705, x: 130, y: 140, width: 1240, height: 800 },
  { from: 1706, to: 1781, x: 130, y: 140, width: 760, height: 800 },
];
const blank = PICTOGRAM_BOXES.map((box) => `drawbox=x=${box.x}:y=${box.y}:w=${box.width}:h=${box.height}:color=black:t=fill:enable='between(n,${box.from},${box.to})'`).join(",");
const BATCH = 60;

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../out");
const video = resolve(process.argv[2] ?? resolve(out, "Technical.mp4"));
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
  execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `${blank},select=not(mod(n\\,${every}))`, "-fps_mode", "vfr", "-q:v", "2", resolve(framesDir, "f_%05d.jpg")]);
  return readdirSync(framesDir).filter((name) => name.endsWith(".jpg")).sort();
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
