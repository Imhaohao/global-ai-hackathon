import type { SymptomMatch } from "./matchSymptoms.ts";
import type { DiseaseCatalog, DiseaseInfo } from "./types.ts";

export const SMS_MAX_CHARS = 459;
export const SMS_MAX_UNICODE_CHARS = 201;

const DESCRIBE_PROMPT =
  "Tell me what the coffee leaf looks like: colour of the spots, top or underside, any powder, rings, or tunnels. Example: orange powder under the leaves.";

const ASCII_REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u02bc]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00b0/g, " degrees "],
];

const PRINTABLE_ASCII = /^[\x20-\x7e\n]*$/;
const SENTENCE_END = /[.!?\u1362\u0964]\s/g;

function collapseSpaces(text: string): string {
  return text.replace(/[ \t]+/g, " ").trim();
}

export function toSmsSafeText(text: string): string {
  const replaced = ASCII_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text,
  );
  const withoutDiacritics = replaced.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (PRINTABLE_ASCII.test(withoutDiacritics)) return collapseSpaces(withoutDiacritics);
  return collapseSpaces(replaced.normalize("NFC").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ""));
}

export function smsCharLimit(safeText: string): number {
  return PRINTABLE_ASCII.test(safeText) ? SMS_MAX_CHARS : SMS_MAX_UNICODE_CHARS;
}

function lastSentenceEndIndex(text: string): number {
  return [...text.matchAll(SENTENCE_END)].reduce((last, match) => match.index ?? last, -1);
}

export function fitToSms(text: string): string {
  const safe = toSmsSafeText(text);
  const limit = smsCharLimit(safe);
  const characters = [...safe];
  if (characters.length <= limit) return safe;
  const cut = characters.slice(0, limit).join("");
  const sentenceEnd = lastSentenceEndIndex(cut);
  return sentenceEnd > cut.length / 2 ? cut.slice(0, sentenceEnd + 1) : cut;
}

function numberedActions(disease: DiseaseInfo, count: number): string {
  return disease.actions
    .slice(0, count)
    .map((action, index) => `${index + 1}) ${action}`)
    .join(" ");
}

function diagnosisReply(disease: DiseaseInfo, actionCount: number): string {
  const steps = numberedActions(disease, actionCount);
  if (disease.key === "healthy") return `Your leaves sound healthy. ${steps}`;
  const urgencyNote = disease.urgency === "high" ? " Act soon." : "";
  return `This sounds like ${disease.name}.${urgencyNote} What to do: ${steps}`;
}

function shortestFittingReply(disease: DiseaseInfo): string {
  for (let actionCount = 3; actionCount >= 1; actionCount--) {
    const reply = toSmsSafeText(diagnosisReply(disease, actionCount));
    if (reply.length <= smsCharLimit(reply)) return reply;
  }
  return fitToSms(diagnosisReply(disease, 1));
}

export function buildOfflineReply(match: SymptomMatch, catalog: DiseaseCatalog): string {
  if (match.kind === "noMatch") return toSmsSafeText(DESCRIBE_PROMPT);
  if (match.kind === "confident") return shortestFittingReply(catalog[match.best.key]);

  const [first, second] = match.candidates.map((candidate) => catalog[candidate.key]);
  const hint = first.tellApart ?? second.tellApart ?? "";
  return fitToSms(`It could be ${first.name} or ${second.name}. ${hint} Reply with what you see to narrow it down.`);
}
