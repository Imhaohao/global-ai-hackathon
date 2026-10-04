import type { CopyKey } from "./actionCard.en.ts";
import { adviceTextFor, type AdviceChannel, type AdviceText } from "./adviceText.ts";
import { COOPERATIVE_OFFICER } from "./contacts.ts";
import type { ActionCard, ActionContext, ActionInput, AppLanguage, FarmDecision, PlantVerdict, WetDays } from "./contract.ts";
import { DISEASES } from "./diseases.ts";
import { toSmsSafeText } from "./smsReply.ts";
import type { DiseaseKey } from "./types.ts";
import { isFreshWetDays } from "./wetDays.ts";

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

function copy(key: CopyKey, text: AdviceText, values: Record<string, string> = {}): string {
  const template = text.copy[key];
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function diseaseName(condition: DiseaseKey, text: AdviceText): string {
  return text.diseases[condition].name;
}

function diseaseActions(condition: DiseaseKey, text: AdviceText): string[] {
  return text.diseases[condition].actions;
}

function sprayLine(actions: string[], text: AdviceText): string[] {
  return actions.map((action, index) =>
    index === RUST_SPRAY_ACTION_INDEX ? `${action} ${copy("labelRate", text)}` : action,
  );
}

function withoutSprayLine(actions: string[]): string[] {
  return actions.filter((_, index) => index !== RUST_SPRAY_ACTION_INDEX);
}

type StepBuilder = (actions: string[], decision: FarmDecision, text: AdviceText) => string[];

const useAllActions: StepBuilder = (actions) => actions;

const STEP_BUILDERS: Record<DiseaseKey, StepBuilder> = {
  healthy: (actions, _decision, text) => [diseaseActions("rust", text)[0], ...actions.slice(0, 2)],
  rust: (actions, decision, text) => (decision === "spray" ? sprayLine(actions, text) : withoutSprayLine(actions)),
  cercospora: useAllActions,
  phoma: useAllActions,
  miner: useAllActions,
  weevil: useAllActions,
  mites: useAllActions,
};

function decisionFor(rule: ConditionRule, wetDays?: WetDays): FarmDecision {
  const sprayThreshold = rule.sprayFromWetDays;
  if (sprayThreshold === undefined || !isFreshWetDays(wetDays)) return rule.decision;
  return wetDays.wetDaysLast7 >= sprayThreshold ? "spray" : rule.decision;
}

function rainReasonLines(decision: FarmDecision, wetDays: WetDays | undefined, text: AdviceText): string[] {
  if (decision !== "spray" || !wetDays) return [];
  return [copy("rainReason", text, { n: String(wetDays.wetDaysLast7), source: wetDays.source })];
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

type Wording = { language: AppLanguage; text: AdviceText };

function whatElseCouldItBe(text: AdviceText): string[] {
  return ELSE_KEYS.map((key) => copy(key, text));
}

function cardShell({ language, text }: Wording): Pick<ActionCard, "whatElseCouldItBe" | "contact" | "language"> {
  return { whatElseCouldItBe: whatElseCouldItBe(text), contact: COOPERATIVE_OFFICER, language };
}

function retakeCard(wording: Wording): ActionCard {
  const { text } = wording;
  return {
    ...cardShell(wording),
    condition: null,
    decision: "monitor",
    urgency: "low",
    headline: copy("headlineRetake", text),
    doNow: RETAKE_KEYS.map((key) => copy(key, text)),
    recheckInDays: RETAKE_RECHECK_DAYS,
    needsPerson: false,
    sourceUrls: [],
  };
}

function notSureHeadline(condition: DiseaseKey | null, suggested: boolean, text: AdviceText): string {
  if (condition === null || !suggested) return copy("headlineNotSure", text);
  return copy("headlineMightBe", text, { name: diseaseName(condition, text) });
}

function notSureCard(condition: DiseaseKey | null, suggested: boolean, wording: Wording): ActionCard {
  const { text } = wording;
  return {
    ...cardShell(wording),
    condition,
    decision: "callOfficer",
    urgency: condition ? DISEASES[condition].urgency : "medium",
    headline: notSureHeadline(condition, suggested, text),
    doNow: [copy("sendToOfficer", text)],
    recheckInDays: NOT_SURE_RECHECK_DAYS,
    needsPerson: true,
    sourceUrls: condition ? DISEASES[condition].sources : [],
  };
}

function headlineForDiagnosis(condition: DiseaseKey, decision: FarmDecision, text: AdviceText): string {
  if (condition === "healthy") return copy("headlineHealthy", text);
  const key: Record<FarmDecision, CopyKey> = {
    spray: "headlineSpray",
    pruneAndClean: "headlinePrune",
    monitor: "headlineMonitor",
    callOfficer: "headlineAskOfficer",
  };
  return copy(key[decision], text, { name: diseaseName(condition, text) });
}

function diagnosedCard(condition: DiseaseKey, context: ActionContext, wording: Wording): ActionCard {
  const { text } = wording;
  const rule = CONDITION_RULES[condition];
  const decision = decisionFor(rule, context.wetDays);
  const steps = STEP_BUILDERS[condition](diseaseActions(condition, text), decision, text);
  const officerStep = rule.needsPerson ? [copy("sendToOfficer", text)] : [];
  return {
    ...cardShell(wording),
    condition,
    decision,
    urgency: DISEASES[condition].urgency,
    headline: headlineForDiagnosis(condition, decision, text),
    doNow: [...rainReasonLines(decision, context.wetDays, text), ...steps, ...officerStep],
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
  const text = adviceTextFor(card.language, "sms");
  return toSmsSafeText(copy(SMS_DECISION_KEYS[card.decision], text, { days: String(card.recheckInDays) }));
}

/** Text messages cannot carry the "not checked yet" note the app shows, so they only use checked translations. */
const CHANNEL_BY_INPUT: Record<ActionInput["kind"], AdviceChannel> = { plant: "app", sms: "sms" };

export function buildActionCard(input: ActionInput, context: ActionContext): ActionCard {
  const wording: Wording = { language: context.language, text: adviceTextFor(context.language, CHANNEL_BY_INPUT[input.kind]) };
  const situation = situationOf(input);
  if (situation.type === "retake") return retakeCard(wording);
  if (situation.type === "notSure") return notSureCard(situation.condition, situation.suggested, wording);
  return diagnosedCard(situation.condition, context, wording);
}
