import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DISEASES } from "../diseases.ts";
import { matchSymptoms } from "../matchSymptoms.ts";
import type { DiseaseKey } from "../types.ts";
import { checkProductLabel } from "./checkProductLabel.ts";
import { FARMER_MESSAGE_CASES, VERDICT_CASES } from "./evalCases.ts";
import type { FarmerMessageCase } from "./evalCases.ts";
import { createLlamaServerModel } from "./llamaServerModel.ts";
import type { LocalModel } from "./localModel.ts";
import { activeLocalModel, llamaServerCommand } from "./modelCatalog.ts";
import { parseFarmerMessage, textForSymptomMatcher } from "./parseFarmerMessage.ts";
import { phraseVerdictInSwahili } from "./phraseVerdict.ts";
import { readProductLabel } from "./readProductLabel.ts";

type DiseaseOutcome = "right" | "unsure" | "wrong";

interface Tally {
  fieldsRight: number;
  fieldsTotal: number;
  unsureParses: number;
  baseline: Record<DiseaseOutcome, number>;
  withModel: Record<DiseaseOutcome, number>;
}

function diseaseOutcome(text: string, expected: DiseaseKey): DiseaseOutcome {
  const match = matchSymptoms(text, DISEASES);
  if (match.kind !== "confident") return "unsure";
  return match.best.key === expected ? "right" : "wrong";
}

async function scoreCase(model: LocalModel, testCase: FarmerMessageCase, tally: Tally): Promise<void> {
  const report = await parseFarmerMessage(model, testCase.message);
  const expectedFields = Object.entries(testCase.expected);
  tally.fieldsTotal += expectedFields.length;
  if (report.status === "unsure") tally.unsureParses += 1;
  const actual = report.status === "ok" ? (report.value as unknown as Record<string, unknown>) : {};
  const misses = expectedFields.filter(([field, value]) => actual[field] !== value).map(([field]) => field);
  tally.fieldsRight += expectedFields.length - misses.length;
  if (testCase.disease) {
    tally.baseline[diseaseOutcome(testCase.message, testCase.disease)] += 1;
    tally.withModel[diseaseOutcome(textForSymptomMatcher(testCase.message, report), testCase.disease)] += 1;
  }
  const translation = report.status === "ok" ? report.value.symptomsInEnglish : report.reason;
  console.log(`${misses.length ? "MISS " + misses.join(",") : "ok  "} | ${testCase.message} -> ${translation}`);
}

function percent(part: number, whole: number): string {
  return `${Math.round((100 * part) / Math.max(whole, 1))}%`;
}

async function evalMessages(model: LocalModel): Promise<void> {
  const empty = () => ({ right: 0, unsure: 0, wrong: 0 });
  const tally: Tally = { fieldsRight: 0, fieldsTotal: 0, unsureParses: 0, baseline: empty(), withModel: empty() };
  for (const testCase of FARMER_MESSAGE_CASES) await scoreCase(model, testCase, tally);
  console.log(`\nFields right: ${tally.fieldsRight}/${tally.fieldsTotal} (${percent(tally.fieldsRight, tally.fieldsTotal)}), unsure parses: ${tally.unsureParses}`);
  console.log("Symptom matcher on the raw message:   ", tally.baseline);
  console.log("Symptom matcher with the model's help:", tally.withModel);
}

async function evalPhrasing(model: LocalModel): Promise<void> {
  console.log("\nSwahili phrasing (a native speaker must judge these):");
  for (const verdict of VERDICT_CASES) {
    const phrased = await phraseVerdictInSwahili(model, verdict);
    console.log(`[${phrased.source}${phrased.rejectedBecause ? `: ${phrased.rejectedBecause}` : ""}] ${phrased.text}`);
  }
}

async function evalLabels(model: LocalModel, photoDir: string): Promise<void> {
  const context = { today: new Date(), flaggedBatchNumbers: new Set<string>() };
  const photos = readdirSync(photoDir).filter((name) => /\.jpe?g$/i.test(name));
  console.log(`\nLabels in ${photoDir} (${photos.length} photos):`);
  for (const photo of photos) {
    const reading = await readProductLabel(model, readFileSync(join(photoDir, photo)).toString("base64"));
    const fields = reading.status === "ok" ? JSON.stringify(reading.value) : reading.reason;
    console.log(`${photo}: ${checkProductLabel(reading, context).kind} | ${fields}`);
  }
}

async function main(): Promise<void> {
  const spec = activeLocalModel();
  const baseUrl = process.env.LOCAL_MODEL_URL ?? "http://127.0.0.1:8089";
  const health = await fetch(`${baseUrl}/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`No model server at ${baseUrl}. Start one with:\n${llamaServerCommand(spec, "~/.cache/leaf-doctor/models", 8089)}`);
    process.exit(1);
  }
  const model = createLlamaServerModel(spec, baseUrl);
  console.log(`Evaluating ${spec.displayName}\n`);
  await evalMessages(model);
  await evalPhrasing(model);
  const photoDir = process.argv[2];
  if (photoDir) await evalLabels(model, photoDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
