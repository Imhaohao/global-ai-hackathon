// Fails if any checked frame of the rendered reel shows more than 10 readable words.
// It takes every 3rd frame of out/Technical.mp4, reads it with Apple's Vision OCR (scripts/ocrWords.swift) and counts
// words, where a word is any whitespace-separated token with a letter or digit, so numbers count too.
// Usage: node scripts/checkWords.ts [video] [every]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beatLength, buildBeats, totalFrames, wordFrame, type BeatId, type Timing } from "../src/lib/beats.ts";
import { KEYPAD_LEGENDS } from "../src/lib/keypad.ts";

const MAX_WORDS = 10;

const timings = JSON.parse(readFileSync(new URL("../src/voiceTimings.json", import.meta.url), "utf8")) as Timing[];
const beats = buildBeats(timings);
const find = (id: string) => beats.find((item) => item.id === id)!;
const end = totalFrames(beats) - 1;

/**
 * The 100-farmer grid is a pictogram: Vision reads its signal bars and phone-in-hand figures as "all", "lll" or "DФ".
 * Its box is blanked before OCR, only in the frames where the grid is on screen; every other pixel is still read.
 * Boxes follow src/scenes/Problem.tsx (GRID) and src/scenes/Close.tsx (the grid, which slides left before the name).
 */
function pictogramBoxes() {
  const close = find("close");
  const gridIn = close.from + wordFrame(close, "reach") - 12;
  const nameIn = close.from + wordFrame(close, "need") - 8 + 30;
  return [
    { from: 0, to: find("hub").from - 1, x: 160, y: 120, width: 840, height: 840 },
    { from: gridIn, to: nameIn - 1, x: 130, y: 140, width: 1240, height: 800 },
    { from: nameIn, to: end, x: 130, y: 140, width: 740, height: 800 },
  ];
}
const PICTOGRAM_BOXES = pictogramBoxes();

/** The flip phone's printed key legends (1, 2 abc ... 9 wxyz, 0 +) are part of the object, not text: in the beats where
 * the phone is on screen they are left out of the count. Every other word is still counted. */
const PHONE_BEATS = ["hub", "tiny"].map((id) => ({ from: find(id).from, to: find(id).from + beatLength(beats, id as BeatId) - 1 }));
const LEGENDS = new Set(KEYPAD_LEGENDS);
const phoneOnScreen = (frame: number) => PHONE_BEATS.some((range) => frame >= range.from && frame <= range.to);

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

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/** A key legend as OCR reads it: trailing punctuation dropped, and one misread letter allowed ("ikl" for "jkl"). */
function isLegend(token: string) {
  const clean = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (LEGENDS.has(clean)) return true;
  return clean.length >= 3 && [...LEGENDS].some((legend) => legend.length >= 3 && editDistance(clean, legend) <= 1);
}

/** Tokens with a letter or digit, as ocrWords.swift counts them, minus key legends while the phone is on screen. */
function countWords(text: string, frame: number) {
  const tokens = text.split(/[\s|]+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  return phoneOnScreen(frame) ? tokens.filter((token) => !isLegend(token)).length : tokens.length;
}

function readBatch(files: string[]): Reading[] {
  const run = spawnSync(ocrBinary, files.map((name) => resolve(framesDir, name)), { maxBuffer: 64 * 1024 * 1024 });
  return run.stdout
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [path, , text = ""] = line.split("\t");
      const index = Number(path.match(/f_(\d+)\.jpg$/)?.[1] ?? 0);
      const frame = (index - 1) * every;
      return { frame, words: countWords(text, frame), text };
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
