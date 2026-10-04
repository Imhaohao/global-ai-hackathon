import { buildActionCard, decisionLine } from "./actionCard.ts";
import type { AppLanguage } from "./contract.ts";
import { DISEASES } from "./diseases.ts";
import { DISEASES_IN_SWAHILI } from "./diseases.sw.ts";
import { buildOfflineReply, ENGLISH_WORDING, fitToSms, smsCharLimit, SWAHILI_WORDING, toSmsSafeText } from "./smsReply.ts";
import type { ReplyMatch } from "./smsReply.ts";

function catalogFor(language: AppLanguage) {
  return language === "sw" ? DISEASES_IN_SWAHILI : DISEASES;
}

function wordingFor(language: AppLanguage) {
  return language === "sw" ? SWAHILI_WORDING : ENGLISH_WORDING;
}

function numberedActions(actions: string[], count: number): string {
  return actions
    .slice(0, count)
    .map((action, index) => `${index + 1}) ${action}`)
    .join(" ");
}

function diagnosisFromCard(
  match: Extract<ReplyMatch, { kind: "confident" }>,
  actions: string[],
  language: AppLanguage,
  reservedChars: number,
): string {
  const disease = catalogFor(language)[match.best.key];
  const wording = wordingFor(language);
  for (let count = Math.min(actions.length, 3); count >= 1; count -= 1) {
    const steps = numberedActions(actions, count);
    const candidate = disease.key === "healthy"
      ? wording.healthy(steps)
      : wording.diagnosis(disease.name, disease.urgency === "high", steps);
    const safeCandidate = toSmsSafeText(candidate);
    if (safeCandidate.length + reservedChars <= smsCharLimit(safeCandidate)) return safeCandidate;
  }
  return fitToSms(disease.key === "healthy" ? wording.healthy(numberedActions(actions, 1)) : wording.diagnosis(
    disease.name,
    disease.urgency === "high",
    numberedActions(actions, 1),
  ), reservedChars);
}

/**
 * Builds the farmer-facing answer from the symptom match and the shared action rules.
 * Model output can supply language or translation, but it never supplies advice text.
 */
export function buildRuleBasedReply(match: ReplyMatch, language: AppLanguage, reservedChars = 0): string {
  const catalog = catalogFor(language);
  const wording = wordingFor(language);
  if (match.kind !== "confident") return buildOfflineReply(match, catalog, wording, reservedChars);

  const card = buildActionCard({ kind: "sms", condition: match.best.key, confirmed: true }, { language });
  const line = decisionLine(card);
  const diagnosis = diagnosisFromCard(match, card.doNow, language, line.length + 1 + reservedChars);
  return fitToSms(`${diagnosis} ${line}`, reservedChars);
}
