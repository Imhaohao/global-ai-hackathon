// Writes out/keypad-masks.json: for every frame, the boxes the word check must black out before OCR. Those are the
// basic phone's printed keypad legends and the iPhone screen while it plays the real app, because key legends and the
// app's own UI are part of the product being shown, not text the video adds.
// Usage: node scripts/writeMasks.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appScreenBoxes } from "../src/app/shots.ts";
import { legendBoxAt } from "../src/story/framing.ts";
import { DURATION } from "../src/timeline.ts";

const here = dirname(fileURLToPath(import.meta.url));
type Box = { x: number; y: number; width: number; height: number };
const masks: Record<number, number[][]> = {};
for (let frame = 0; frame < DURATION; frame += 1) {
  const legend = legendBoxAt(frame);
  const boxes: Box[] = [...(legend ? [legend] : []), ...appScreenBoxes(frame)];
  if (boxes.length) masks[frame] = boxes.map((box) => [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]);
}
mkdirSync(resolve(here, "../out"), { recursive: true });
writeFileSync(resolve(here, "../out/keypad-masks.json"), JSON.stringify(masks));
console.log(`wrote masks for ${Object.keys(masks).length} frames`);
