import { ENGLISH_COPY } from "./actionCard.en.ts";
import type { CopyKey } from "./actionCard.en.ts";
import { ACTION_CARD_SW } from "./actionCard.sw.ts";
import { COOPERATIVE_OFFICER } from "./contacts.ts";
import type { ActionCard, ActionContext, ActionInput, AppLanguage, FarmDecision, PlantVerdict, WetDays } from "./contract.ts";
import { DISEASES } from "./diseases.ts";
import { DISEASES_SW } from "./diseases.sw.ts";
import { toSmsSafeText } from "./smsReply.ts";
import type { DiseaseKey } from "./types.ts";

export const PLACEHOLDER_CONTACT = COOPERATIVE_OFFICER;

interface ConditionRule {
  decision: FarmDecision;
  needsPerson: boolean;
  recheckInDays: number;
  sprayFromWetDays?: number;
}

export const CONDITION_RULES: Record<DiseaseKey, ConditionRule> = {
  healthy: { decision: "monitor", needsPerson: false, recheckInDays: 14 },
  rust: { decision: "pruneAndClean", needsPerson: false, recheckInDays: 7, sprayFromWetDays: 3 },
  cercospora: { decision: "pruneAndClean", needsPerson: false, recheckInDays: 14 },
  phoma: { decision: "pruneAndClean", needsPerson: false, recheckInDays: 14 },
  miner: { decision: "monitor", needsPerson: false, recheckInDays: 14 },
  weevil: { decision: "callOfficer", needsPerson: true, recheckInDays: 7 },
  mites: { decision: "callOfficer", needsPerson: true, recheckInDays: 7 },
};

export const RUST_SPRAY_ACTION_INDEX = 4;

const RETAKE_RECHECK_DAYS = 1;
const NOT_SURE_RECHECK_DAYS = 7;

type Situation =
  | { type: "retake" }
  | { type: "notSure"; condition: DiseaseKey | null; suggested: boolean }
  | { type: "diagnosed"; condition: DiseaseKey };

const ELSE_KEYS: CopyKey[] = ["elseBerryDisease", "elseBerryBorer", "elseWilt", "elseNutrition"];
const RETAKE_KEYS: CopyKey[] = ["retakeDaylight", "retakeSteady", "retakeFillFrame"];

function copy(key: CopyKey, language: AppLanguage, values: Record<string, string> = {}): string {
  const swahili = ACTION_CARD_SW[key];
  const template = language === "sw" && swahili.reviewed ? swahili.text : ENGLISH_COPY[key];
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function diseaseName(condition: DiseaseKey, language: AppLanguage): string {
  return language === "sw" ? DISEASES_SW[condition].name : DISEASES[condition].name;
}

function diseaseActions(condition: DiseaseKey, language: AppLanguage): string[] {
  return language === "sw" ? DISEASES_SW[condition].actions : DISEASES[condition].actions;
}

function sprayLine(actions: string[], language: AppLanguage): string[] {
  return actions.map((action, index) =>
    index === RUST_SPRAY_ACTION_INDEX ? `${action} ${copy("labelRate", language)}` : action,
  );
}

function withoutSprayLine(actions: string[]): string[] {
  return actions.filter((_, index) => index !== RUST_SPRAY_ACTION_INDEX);
}

type StepBuilder = (actions: string[], decision: FarmDecision, language: AppLanguage) => string[];

const useAllActions: StepBuilder = (actions) => actions;

const STEP_BUILDERS: Record<DiseaseKey, StepBuilder> = {
  healthy: (actions, _decision, language) => [diseaseActions("rust", language)[0], ...actions.slice(0, 2)],
  rust: (actions, decision, language) => (decision === "spray" ? sprayLine(actions, language) : withoutSprayLine(actions)),
  cercospora: useAllActions,
  phoma: useAllActions,
  miner: useAllActions,
  weevil: useAllActions,
  mites: useAllActions,
};

function decisionFor(rule: ConditionRule, wetDays?: WetDays): FarmDecision {
  const sprayThreshold = rule.sprayFromWetDays;
  if (sprayThreshold === undefined || !wetDays) return rule.decision;
  return wetDays.wetDaysLast7 >= sprayThreshold ? "spray" : rule.decision;
}

function rainReasonLines(decision: FarmDecision, wetDays: WetDays | undefined, language: AppLanguage): string[] {
  if (decision !== "spray" || !wetDays) return [];
  return [copy("rainReason", language, { n: String(wetDays.wetDaysLast7), source: wetDays.source })];
}

function verdictSituation(verdict: PlantVerdict): Situation {
  if (verdict.kind === "answer") return { type: "diagnosed", condition: verdict.condition };
  if (verdict.kind === "retake") return { type: "retake" };
  return { type: "notSure", condition: null, suggested: false };
}

function situationOf(input: ActionInput): Situation {
  if (input.kind === "plant") return verdictSituation(input.verdict);
  if (input.condition === null) return { type: "notSure", condition: null, suggested: false };
  if (!input.confirmed) return { type: "notSure", condition: input.condition, suggested: true };
  return { type: "diagnosed", condition: input.condition };
}

function whatElseCouldItBe(language: AppLanguage): string[] {
  return ELSE_KEYS.map((key) => copy(key, language));
}

function cardShell(language: AppLanguage): Pick<ActionCard, "whatElseCouldItBe" | "contact" | "language"> {
  return { whatElseCouldItBe: whatElseCouldItBe(language), contact: COOPERATIVE_OFFICER, language };
}

function retakeCard(language: AppLanguage): ActionCard {
  return {
    ...cardShell(language),
    condition: null,
    decision: "monitor",
    urgency: "low",
    headline: copy("headlineRetake", language),
    doNow: RETAKE_KEYS.map((key) => copy(key, language)),
    recheckInDays: RETAKE_RECHECK_DAYS,
    needsPerson: false,
    sourceUrls: [],
  };
}

function notSureHeadline(condition: DiseaseKey | null, suggested: boolean, language: AppLanguage): string {
  if (condition === null || !suggested) return copy("headlineNotSure", language);
  return copy("headlineMightBe", language, { name: diseaseName(condition, language) });
}

function notSureCard(condition: DiseaseKey | null, suggested: boolean, language: AppLanguage): ActionCard {
  return {
    ...cardShell(language),
    condition,
    decision: "callOfficer",
    urgency: condition ? DISEASES[condition].urgency : "medium",
    headline: notSureHeadline(condition, suggested, language),
    doNow: [copy("sendToOfficer", language)],
    recheckInDays: NOT_SURE_RECHECK_DAYS,
    needsPerson: true,
    sourceUrls: condition ? DISEASES[condition].sources : [],
  };
}

function headlineForDiagnosis(condition: DiseaseKey, decision: FarmDecision, language: AppLanguage): string {
  if (condition === "healthy") return copy("headlineHealthy", language);
  const key: Record<FarmDecision, CopyKey> = {
    spray: "headlineSpray",
    pruneAndClean: "headlinePrune",
    monitor: "headlineMonitor",
    callOfficer: "headlineAskOfficer",
  };
  return copy(key[decision], language, { name: diseaseName(condition, language) });
}

function diagnosedCard(condition: DiseaseKey, context: ActionContext): ActionCard {
  const { language } = context;
  const rule = CONDITION_RULES[condition];
  const decision = decisionFor(rule, context.wetDays);
  const steps = STEP_BUILDERS[condition](diseaseActions(condition, language), decision, language);
  const officerStep = rule.needsPerson ? [copy("sendToOfficer", language)] : [];
  return {
    ...cardShell(language),
    condition,
    decision,
    urgency: DISEASES[condition].urgency,
    headline: headlineForDiagnosis(condition, decision, language),
    doNow: [...rainReasonLines(decision, context.wetDays, language), ...steps, ...officerStep],
    recheckInDays: rule.recheckInDays,
    needsPerson: rule.needsPerson,
    sourceUrls: DISEASES[condition].sources,
  };
}

const SMS_DECISION_KEYS: Record<FarmDecision, CopyKey> = {
  spray: "smsDecisionSpray",
  pruneAndClean: "smsDecisionPrune",
  monitor: "smsDecisionMonitor",
  callOfficer: "smsDecisionCallOfficer",
};

export function decisionLine(card: ActionCard): string {
  return toSmsSafeText(copy(SMS_DECISION_KEYS[card.decision], card.language, { days: String(card.recheckInDays) }));
}

export function buildActionCard(input: ActionInput, context: ActionContext): ActionCard {
  const situation = situationOf(input);
  if (situation.type === "retake") return retakeCard(context.language);
  if (situation.type === "notSure") return notSureCard(situation.condition, situation.suggested, context.language);
  return diagnosedCard(situation.condition, context);
}
