import type { DiseaseScore, SymptomMatch } from "./matchSymptoms.ts";
import type { DiseaseCatalog, DiseaseInfo } from "./types.ts";

export const SMS_MAX_CHARS = 459;
export const SMS_MAX_UNICODE_CHARS = 201;

export type ReplyMatch = SymptomMatch | { kind: "confirmFirst"; best: DiseaseScore };

export interface ReplyWording {
  describe: string;
  healthy: (steps: string) => string;
  diagnosis: (name: string, urgent: boolean, steps: string) => string;
  twoCandidates: (first: string, second: string, hint: string) => string;
  confirmFirst: (name: string, hint: string) => string;
}

export const ENGLISH_WORDING: ReplyWording = {
  describe:
    "Tell me what the coffee leaf looks like: colour of the spots, top or underside, any powder, rings, or tunnels. Example: orange powder under the leaves.",
  healthy: (steps) => `Your leaves sound healthy. ${steps}`,
  diagnosis: (name, urgent, steps) => `This sounds like ${name}.${urgent ? " Act soon." : ""} What to do: ${steps}`,
  twoCandidates: (first, second, hint) => `It could be ${first} or ${second}. ${hint} Reply with what you see to narrow it down.`,
  confirmFirst: (name, hint) => `This might be ${name}. ${hint} Reply with what you see so we can be sure.`,
};

// Written by the team; needs review by a native Swahili speaker before real use.
export const SWAHILI_WORDING: ReplyWording = {
  describe:
    "Niambie jani la kahawa linavyoonekana: rangi ya madoa, juu au chini ya jani, kama kuna unga, duara au vichuguu. Mfano: unga wa machungwa chini ya majani.",
  healthy: (steps) => `Majani yako yanaonekana mazima. ${steps}`,
  diagnosis: (name, urgent, steps) => `Hii inaonekana kama ${name}.${urgent ? " Chukua hatua haraka." : ""} Cha kufanya: ${steps}`,
  twoCandidates: (first, second, hint) => `Inaweza kuwa ${first} au ${second}. ${hint} Jibu ukieleza unachoona ili tujue zaidi.`,
  confirmFirst: (name, hint) => `Huenda ni ${name}. ${hint} Jibu ukieleza unachoona ili tuhakikishe.`,
};

const ASCII_REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u02bc]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00b0/g, " degrees "],
  [/[\u00bf\u00a1]/g, ""],
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

export function fitToSms(text: string, reservedChars = 0): string {
  const safe = toSmsSafeText(text);
  const limit = smsCharLimit(safe) - reservedChars;
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

function diagnosisReply(disease: DiseaseInfo, actionCount: number, wording: ReplyWording): string {
  const steps = numberedActions(disease, actionCount);
  if (disease.key === "healthy") return wording.healthy(steps);
  return wording.diagnosis(disease.name, disease.urgency === "high", steps);
}

function shortestFittingReply(disease: DiseaseInfo, wording: ReplyWording, reservedChars: number): string {
  for (let actionCount = 3; actionCount >= 1; actionCount--) {
    const reply = toSmsSafeText(diagnosisReply(disease, actionCount, wording));
    if (reply.length + reservedChars <= smsCharLimit(reply)) return reply;
  }
  return fitToSms(diagnosisReply(disease, 1, wording), reservedChars);
}

export function buildOfflineReply(
  match: ReplyMatch,
  catalog: DiseaseCatalog,
  wording: ReplyWording = ENGLISH_WORDING,
  reservedChars = 0,
): string {
  if (match.kind === "noMatch") return toSmsSafeText(wording.describe);
  if (match.kind === "confident") return shortestFittingReply(catalog[match.best.key], wording, reservedChars);
  if (match.kind === "confirmFirst") {
    const disease = catalog[match.best.key];
    return fitToSms(wording.confirmFirst(disease.name, disease.tellApart ?? ""));
  }

  const [first, second] = match.candidates.map((candidate) => catalog[candidate.key]);
  const hint = first.tellApart ?? second.tellApart ?? "";
  return fitToSms(wording.twoCandidates(first.name, second.name, hint));
}
