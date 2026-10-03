import type { DiseaseCatalog, DiseaseInfo, DiseaseKey } from "./types.ts";

export interface DiseaseScore {
  key: DiseaseKey;
  score: number;
  matchedWords: string[];
}

export type SymptomMatch =
  | { kind: "confident"; best: DiseaseScore }
  | { kind: "unsure"; candidates: [DiseaseScore, DiseaseScore] }
  | { kind: "noMatch" };

const MIN_CONFIDENT_SCORE = 2;
const MIN_LEAD_OVER_RUNNER_UP = 1;

export function normalizeText(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

function phraseWeight(phrase: string): number {
  return phrase.split(" ").length;
}

function scoreDisease(normalized: string, disease: DiseaseInfo): DiseaseScore {
  const matchedWords = disease.symptomWords.filter((word) =>
    normalized.includes(normalizeText(word)),
  );
  const score = matchedWords.reduce((sum, word) => sum + phraseWeight(word), 0);
  return { key: disease.key, score, matchedWords };
}

export function rankDiseases(text: string, catalog: DiseaseCatalog): DiseaseScore[] {
  const normalized = normalizeText(text);
  return Object.values(catalog)
    .map((disease) => scoreDisease(normalized, disease))
    .sort((a, b) => b.score - a.score);
}

export function matchSymptoms(text: string, catalog: DiseaseCatalog): SymptomMatch {
  const [best, runnerUp] = rankDiseases(text, catalog);
  if (!best || best.score === 0) return { kind: "noMatch" };

  const lead = best.score - (runnerUp?.score ?? 0);
  if (best.score >= MIN_CONFIDENT_SCORE && lead >= MIN_LEAD_OVER_RUNNER_UP) {
    return { kind: "confident", best };
  }
  if (runnerUp && runnerUp.score > 0) return { kind: "unsure", candidates: [best, runnerUp] };
  return { kind: "confident", best };
}
