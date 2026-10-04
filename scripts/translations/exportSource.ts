// Writes the English text to translate: npx tsx scripts/translations/exportSource.ts <out.json>
import { writeFileSync } from "node:fs";

import { SOURCE_TEXT } from "./sourceText.ts";

const [outPath] = process.argv.slice(2);
if (!outPath) throw new Error("Usage: exportSource.ts <out.json>");
writeFileSync(outPath, `${JSON.stringify(SOURCE_TEXT, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
