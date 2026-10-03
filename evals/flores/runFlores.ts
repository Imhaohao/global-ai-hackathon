import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createLlamaServerModel } from "../../shared/src/localModel/llamaServerModel.ts";
import type { LocalModel } from "../../shared/src/localModel/localModel.ts";
import { activeLocalModel, llamaServerCommand } from "../../shared/src/localModel/modelCatalog.ts";
import type { LocalModelSpec } from "../../shared/src/localModel/modelCatalog.ts";
import { parseFarmerMessage } from "../../shared/src/localModel/parseFarmerMessage.ts";

const DATASET_URL = "https://dl.fbaipublicfiles.com/nllb/flores200_dataset.tar.gz";
const DATASET_LICENSE = "CC-BY-SA 4.0, stated in https://github.com/facebookresearch/flores/blob/main/README.md#licenses (the tarball itself has no licence file)";
const MODELS_ROOT = join(homedir(), ".cache/leaf-doctor/models");
const SERVER_URL = process.env.LOCAL_MODEL_URL ?? "http://127.0.0.1:8089";
const SENTENCE_COUNT = 100;
const RESULTS_PATH = new URL("./results.json", import.meta.url);

const LANGUAGES = { kik_Latn: "Kikuyu", swh_Latn: "Swahili" } as const;
type FloresCode = keyof typeof LANGUAGES;

interface SentenceResult {
  id: number;
  parsedLanguage: string;
  parseUnsureReason?: string;
  translation: string;
}

function devtestLines(floresDir: string, code: string): string[] {
  return readFileSync(join(floresDir, "devtest", `${code}.devtest`), "utf8").trimEnd().split("\n");
}

function evenlySpacedIds(total: number, count: number): number[] {
  const step = Math.floor(total / count);
  return Array.from({ length: count }, (_, index) => index * step + 1);
}

async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function translateToEnglish(spec: LocalModelSpec, languageName: string, sentence: string): Promise<string> {
  const response = await fetch(`${SERVER_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: `Translate the user's ${languageName} text into English. Reply with the English translation only.` },
        { role: "user", content: sentence },
      ],
      max_tokens: 256,
      temperature: 0,
      ...(spec.chatTemplateOptions ? { chat_template_kwargs: spec.chatTemplateOptions } : {}),
    }),
  });
  if (!response.ok) throw new Error(`llama-server returned ${response.status}`);
  const payload = (await response.json()) as { choices: { message: { content: string } }[] };
  return payload.choices[0].message.content.trim();
}

async function runSentence(model: LocalModel, spec: LocalModelSpec, code: FloresCode, id: number, sentence: string): Promise<SentenceResult> {
  const report = await parseFarmerMessage(model, sentence);
  const translation = await translateToEnglish(spec, LANGUAGES[code], sentence);
  if (report.status === "ok") return { id, parsedLanguage: report.value.language, translation };
  return { id, parsedLanguage: "unsure", parseUnsureReason: report.reason, translation };
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

async function runLanguage(model: LocalModel, spec: LocalModelSpec, floresDir: string, code: FloresCode, ids: number[]) {
  const lines = devtestLines(floresDir, code);
  const sentences: SentenceResult[] = [];
  for (const id of ids) {
    sentences.push(await runSentence(model, spec, code, id, lines[id - 1]));
    console.log(`${code} ${id}: ${sentences.at(-1)?.parsedLanguage}`);
  }
  return { language: LANGUAGES[code], parsedLanguageCounts: countBy(sentences.map((s) => s.parsedLanguage)), sentences };
}

async function main(): Promise<void> {
  const floresDir = process.argv[2];
  if (!floresDir) throw new Error("Usage: tsx evals/flores/runFlores.ts <path to extracted flores200_dataset>");
  const spec = activeLocalModel();
  const health = await fetch(`${SERVER_URL}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`No model server at ${SERVER_URL}. Start: ${llamaServerCommand(spec, MODELS_ROOT, 8089)}`);

  const weights = spec.files.find((file) => file.role === "weights");
  if (!weights) throw new Error(`${spec.id} has no weights file`);
  const weightsSha256 = await sha256OfFile(join(MODELS_ROOT, spec.id, weights.fileName));
  const ids = evenlySpacedIds(devtestLines(floresDir, "eng_Latn").length, SENTENCE_COUNT);
  const model = createLlamaServerModel(spec, SERVER_URL);

  const results = {
    runAt: new Date().toISOString(),
    dataset: {
      name: "FLORES-200 devtest",
      url: DATASET_URL,
      license: DATASET_LICENSE,
      note: "FLORES sentences are news-style and general-interest text from Wikinews, Wikibooks and Wikivoyage, not farmer messages.",
      sentenceIdsOneBased: ids,
    },
    model: { id: spec.id, displayName: spec.displayName, weightsFile: weights.fileName, weightsSha256, catalogSha256: weights.sha256 },
    kikuyu: await runLanguage(model, spec, floresDir, "kik_Latn", ids),
    swahili: await runLanguage(model, spec, floresDir, "swh_Latn", ids),
  };
  writeFileSync(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
  console.log("Kikuyu parsed as:", results.kikuyu.parsedLanguageCounts);
  console.log("Swahili parsed as:", results.swahili.parsedLanguageCounts);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
