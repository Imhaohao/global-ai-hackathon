import type { SymptomMatch } from "./matchSymptoms.ts";
import type { DiseaseCatalog, DiseaseInfo } from "./types.ts";

export const SMS_MAX_CHARS = 459;

const DESCRIBE_PROMPT =
  "Tell me what the coffee leaf looks like: colour of the spots, top or underside, any powder, rings, or tunnels. Example: orange powder under the leaves.";

const ASCII_REPLACEMENTS: [RegExp, string][] = [
  [/[‘’ʼ]/g, "'"],
  [/[“”]/g, '"'],
  [/[–—]/g, "-"],
  [/…/g, "..."],
  [/°/g, " degrees "],
];

export function toSmsSafeText(text: string): string {
  const replaced = ASCII_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text,
  );
  return replaced
    .normalize("NFKD")
    .replace(/[^\x20-\x7e\n]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function fitToSms(text: string, maxChars = SMS_MAX_CHARS): string {
  const safe = toSmsSafeText(text);
  if (safe.length <= maxChars) return safe;
  const cut = safe.slice(0, maxChars);
  const lastSentenceEnd = cut.lastIndexOf(". ");
  return lastSentenceEnd > maxChars / 2 ? cut.slice(0, lastSentenceEnd + 1) : cut;
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
    if (reply.length <= SMS_MAX_CHARS) return reply;
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
