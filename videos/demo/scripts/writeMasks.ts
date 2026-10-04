// Writes out/keypad-masks.json: for every frame where Noor's phone is on screen, the box of its printed keypad legends.
// scripts/checkWords.ts blacks out that box before OCR, because key legends are part of the phone, not on-screen text.
// Usage: node scripts/writeMasks.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legendBoxAt } from "../src/story/framing.ts";
import { DURATION } from "../src/timeline.ts";

const here = dirname(fileURLToPath(import.meta.url));
const masks: Record<number, [number, number, number, number]> = {};
for (let frame = 0; frame < DURATION; frame += 1) {
  const box = legendBoxAt(frame);
  if (box) masks[frame] = [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)];
}
mkdirSync(resolve(here, "../out"), { recursive: true });
writeFileSync(resolve(here, "../out/keypad-masks.json"), JSON.stringify(masks));
console.log(`wrote keypad masks for ${Object.keys(masks).length} frames`);
