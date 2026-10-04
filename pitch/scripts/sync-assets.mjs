// Copies the shared stage assets from ../assets into public/stage so the deck can serve them.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, "..", "..", "assets", "stage");
const target = path.join(here, "..", "public", "stage");

const files = [
  ["coffee-slope.glb", "coffee-slope.glb"],
  ["anchors.json", "anchors.json"],
  ["qwantani_sunrise_puresky_1k.hdr", "morning.hdr"],
];

mkdirSync(path.join(target, "screens"), { recursive: true });
mkdirSync(path.join(target, "leaves"), { recursive: true });
for (const [from, to] of files) copyFileSync(path.join(source, from), path.join(target, to));
for (const folder of ["screens", "leaves"]) {
  for (const name of readdirSync(path.join(source, folder))) {
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".webp")) {
      copyFileSync(path.join(source, folder, name), path.join(target, folder, name));
    }
  }
}
console.log(`Stage assets copied to ${path.relative(process.cwd(), target)}`);
