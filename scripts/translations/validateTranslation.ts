/** Names that must reach the farmer unchanged in every language. */
export const PROTECTED_TERMS = ["Leaf Doctor", "KEPHIS", "NASA POWER", "Twilio Verify", "Convex", "Catimor", "Sarchimor"];

export interface Rejection {
  path: string;
  reason: string;
}

export interface ValidationResult {
  /** The translation with every rejected or unexpected line removed, so those lines show in English. */
  kept: unknown;
  rejections: Rejection[];
  missing: string[];
  /** English lines that will show untranslated: missing ones plus rejected ones. */
  untranslatedLines: number;
}

/** How many translatable lines a piece of the English source holds. */
export function lineCount(value: unknown): number {
  if (typeof value === "string") return 1;
  if (Array.isArray(value)) return value.length;
  return value && typeof value === "object" ? Object.values(value).reduce<number>((sum, child) => sum + lineCount(child), 0) : 0;
}

const placeholdersIn = (text: string) => new Set(text.match(/\{\w+\}/g) ?? []);
const numbersIn = (text: string) => new Set(text.match(/\d+/g) ?? []);

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

function lineProblem(english: string, translated: unknown): string | null {
  if (typeof translated !== "string" || translated.trim() === "") return "not a non-empty string";
  if (!sameSet(placeholdersIn(english), placeholdersIn(translated))) return "placeholders differ";
  if (!sameSet(numbersIn(english), numbersIn(translated))) return "numbers differ";
  const lostTerm = PROTECTED_TERMS.find((term) => english.includes(term) && !translated.includes(term));
  return lostTerm ? `lost "${lostTerm}"` : null;
}

type Collector = { rejections: Rejection[]; missing: string[]; untranslatedLines: number };

function validateList(english: string[], translated: unknown, path: string, found: Collector): string[] | undefined {
  if (!Array.isArray(translated) || translated.length !== english.length) {
    found.rejections.push({ path, reason: `needs exactly ${english.length} items` });
    return undefined;
  }
  const problems = english.map((line, index) => lineProblem(line, translated[index]));
  const firstProblem = problems.findIndex((problem) => problem !== null);
  if (firstProblem === -1) return translated as string[];
  found.rejections.push({ path: `${path}[${firstProblem}]`, reason: `${problems[firstProblem]}, so the whole list stays English` });
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const childPathOf = (path: string, key: string) => (path ? `${path}.${key}` : key);

function rejectUnknownKeys(english: Record<string, unknown>, source: Record<string, unknown>, path: string, found: Collector) {
  for (const key of Object.keys(source)) {
    if (!(key in english)) found.rejections.push({ path: childPathOf(path, key), reason: "not in the English source" });
  }
}

function validateRecord(english: Record<string, unknown>, translated: unknown, path: string, found: Collector): Record<string, unknown> {
  const source = asRecord(translated);
  const kept: Record<string, unknown> = {};
  for (const [key, englishValue] of Object.entries(english)) {
    if (englishValue === undefined) continue;
    const childPath = childPathOf(path, key);
    if (!(key in source)) {
      found.missing.push(childPath);
      found.untranslatedLines += lineCount(englishValue);
      continue;
    }
    const value = validateValue(englishValue, source[key], childPath, found);
    if (value === undefined) found.untranslatedLines += lineCount(englishValue);
    else kept[key] = value;
  }
  rejectUnknownKeys(english, source, path, found);
  return kept;
}

function validateValue(english: unknown, translated: unknown, path: string, found: Collector): unknown {
  if (typeof english === "string") {
    const problem = lineProblem(english, translated);
    if (problem === null) return translated;
    found.rejections.push({ path, reason: problem });
    return undefined;
  }
  if (Array.isArray(english)) return validateList(english as string[], translated, path, found);
  return validateRecord(english as Record<string, unknown>, translated, path, found);
}

/** Checks a translation against the English it mirrors and keeps only the lines that are safe to show. */
export function validateTranslation(english: Record<string, unknown>, translated: unknown): ValidationResult {
  const found: Collector = { rejections: [], missing: [], untranslatedLines: 0 };
  const kept = validateRecord(english, translated, "", found);
  return { kept, ...found };
}
