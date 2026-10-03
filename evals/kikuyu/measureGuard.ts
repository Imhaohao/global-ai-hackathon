import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { looksLikeKikuyu } from "../../shared/src/languageGuard.ts";

const DATASET_URL = "https://dl.fbaipublicfiles.com/nllb/flores200_dataset.tar.gz";

function devtestLines(floresDir: string, language: string): string[] {
  return readFileSync(join(floresDir, "devtest", `${language}.devtest`), "utf8").split("\n").filter(Boolean);
}

function withoutKikuyuLetters(text: string): string {
  return text.replace(/ĩ/g, "i").replace(/ũ/g, "u").replace(/Ĩ/g, "I").replace(/Ũ/g, "U");
}

function share(lines: string[]): { flagged: number; total: number; rate: number } {
  const flagged = lines.filter(looksLikeKikuyu).length;
  return { flagged, total: lines.length, rate: Number((flagged / lines.length).toFixed(4)) };
}

function main(): void {
  const floresDir = process.argv[2];
  if (!floresDir) throw new Error("Usage: npx tsx evals/kikuyu/measureGuard.ts <flores200_dataset dir>");
  const kikuyu = devtestLines(floresDir, "kik_Latn");
  const swahili = devtestLines(floresDir, "swh_Latn");
  const english = devtestLines(floresDir, "eng_Latn");
  const results = {
    dataset: DATASET_URL,
    licence: "CC-BY-SA 4.0 (facebookresearch/flores README)",
    split: "devtest; the word list was chosen from the separate dev split",
    note: "News-style sentences, not farmer SMS. Real SMS is shorter, so word-based catch rates on SMS will be lower.",
    kikuyuCaught: share(kikuyu),
    kikuyuCaughtWithoutSpecialLetters: share(kikuyu.map(withoutKikuyuLetters)),
    swahiliWronglyFlagged: share(swahili),
    englishWronglyFlagged: share(english),
  };
  writeFileSync(join("evals", "kikuyu", "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
}

main();
