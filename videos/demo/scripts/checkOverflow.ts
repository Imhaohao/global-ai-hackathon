// Renders every 5th frame with the overflow probe on. The probe throws on the first frame where any text box's content
// spills past its box, so the render fails and this script prints that frame. `--self-test` checks the probe fires.
// Usage: node scripts/checkOverflow.ts
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const framesDir = resolve(root, "out/overflow-frames");
const run = spawnSync(
  "npx",
  ["remotion", "render", "src/index.ts", "DemoVideo", framesDir, "--sequence", "--every-nth-frame=5", "--scale=0.25", "--image-format=jpeg", "--props", JSON.stringify({ checkOverflow: true, overflowSelfTest: process.argv.includes("--self-test") })],
  { cwd: root, maxBuffer: 256 * 1024 * 1024 },
);
const output = `${run.stdout}${run.stderr}`;
const spill = output.match(/OVERFLOW frame \d+: [^\n"]*/)?.[0];
rmSync(framesDir, { recursive: true, force: true });
if (spill) {
  console.log(spill);
  process.exitCode = 1;
} else if (run.status !== 0) {
  throw new Error(`render failed:\n${output.slice(-2000)}`);
} else {
  console.log("no text box overflows on any checked frame");
}
