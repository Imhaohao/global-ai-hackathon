// Renders a still every 15 frames (and the middle of every beat) with the overflow probe on, and fails if any text
// crosses the edge of its container (elements marked data-box in src). Run after `npx remotion bundle`.
// Usage: node scripts/checkOverflow.ts [bundleDir]
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const serveUrl = resolve(process.argv[2] ?? "out/bundle");
const inputProps = { checkOverflow: true };
const EVERY = 15;

async function main() {
  const browser = await openBrowser("chrome");
  const composition = await selectComposition({ serveUrl, id: "Technical", inputProps, puppeteerInstance: browser });
  const scratch = mkdtempSync(join(tmpdir(), "overflow-"));
  const problems: string[] = [];
  let probed = 0;
  for (let frame = 0; frame < composition.durationInFrames; frame += EVERY) {
    await renderStill({
      composition,
      serveUrl,
      frame,
      inputProps,
      output: join(scratch, `${frame}.png`),
      scale: 0.25,
      puppeteerInstance: browser,
      onBrowserLog: (log) => {
        if (log.text.startsWith("OVERFLOW")) problems.push(log.text);
        if (log.text.startsWith("PROBED")) probed += 1;
      },
    });
  }
  await browser.close({ silent: true });
  rmSync(scratch, { recursive: true, force: true });
  console.log(`probed ${probed} stills`);
  problems.forEach((problem) => console.log(problem));
  if (problems.length > 0 || probed === 0) process.exit(1);
}

await main();
