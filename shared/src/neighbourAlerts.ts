import { DISEASES } from "./diseases.ts";
import { matchSymptoms } from "./matchSymptoms.ts";
import { COMPLIANCE_OVERHEAD_CHARS } from "./smsCompliance.ts";
import { fitToSms } from "./smsReply.ts";
import type { DiseaseKey } from "./types.ts";

export const ALERT_AREAS = [
  { id: "chinga", name: "Chinga" },
  { id: "iria-ini", name: "Iria-ini" },
  { id: "karima", name: "Karima" },
  { id: "mahiga", name: "Mahiga" },
] as const;

export type AlertArea = (typeof ALERT_AREAS)[number];
export type AlertAreaId = AlertArea["id"];

export const ALERTABLE_CONDITIONS = ["rust", "cercospora", "miner", "phoma"] as const satisfies readonly DiseaseKey[];
export type AlertableCondition = (typeof ALERTABLE_CONDITIONS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
export const OUTBREAK_WINDOW_MS = 7 * DAY_MS;
export const OUTBREAK_MIN_FARMS = 3;
export const REPORT_RETENTION_MS = 14 * DAY_MS;
const MIN_TEXT_REPORT_SCORE = 2;

export const ALERT_FOOTER = "Text ALERTS OFF to stop these alerts.";

export type AlertCommand =
  | { kind: "join"; area: AlertArea }
  | { kind: "leave" }
  | { kind: "list" }
  | { kind: "unknownArea" };

const COMMAND = /^alerts\b[\s:,.!-]*(.*)$/is;
const LEAVE_WORDS = /^(off|stop|leave|end)[.!]*$/i;
const AREA_LIST = `${ALERT_AREAS.slice(0, -1).map((area) => area.name).join(", ")} or ${ALERT_AREAS.at(-1)?.name}`;

function areaKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "");
}

const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout"]);

export function isStopRequest(text: string): boolean {
  return STOP_KEYWORDS.has(areaKey(text));
}

export function findAlertArea(text: string): AlertArea | null {
  const key = areaKey(text);
  return ALERT_AREAS.find((area) => areaKey(area.name) === key) ?? null;
}

export function alertAreaById(id: string): AlertArea | null {
  return ALERT_AREAS.find((area) => area.id === id) ?? null;
}

export function parseAlertCommand(text: string): AlertCommand | null {
  const match = COMMAND.exec(text.trim());
  if (!match) return null;
  const rest = match[1].trim();
  if (!rest) return { kind: "list" };
  if (LEAVE_WORDS.test(rest)) return { kind: "leave" };
  const area = findAlertArea(rest);
  return area ? { kind: "join", area } : { kind: "unknownArea" };
}

export function alertCommandReply(command: AlertCommand): string {
  switch (command.kind) {
    case "join":
      return `You will get a text when ${OUTBREAK_MIN_FARMS} or more farms in ${command.area.name} report the same leaf disease within a week. A cooperative officer checks each alert before it goes out. ${ALERT_FOOTER}`;
    case "leave":
      return "You will not get area alerts any more. Text ALERTS and your area to join again.";
    case "list":
      return `To hear when farms near you report a leaf disease, text ALERTS and your area: ${AREA_LIST}.`;
    case "unknownArea":
      return `I do not know that area yet. Text ALERTS and one of: ${AREA_LIST}.`;
  }
}

export function isAlertableCondition(condition: string): condition is AlertableCondition {
  return (ALERTABLE_CONDITIONS as readonly string[]).includes(condition);
}

export function conditionReportedInText(text: string): AlertableCondition | null {
  const match = matchSymptoms(text, DISEASES);
  if (match.kind !== "confident" || match.best.score < MIN_TEXT_REPORT_SCORE) return null;
  return isAlertableCondition(match.best.key) ? match.best.key : null;
}

export interface AreaReport {
  farmerId: string;
  reportedAt: number;
}

export function farmsReportingRecently(reports: AreaReport[], now: number): number {
  const recent = reports.filter((report) => now - report.reportedAt <= OUTBREAK_WINDOW_MS);
  return new Set(recent.map((report) => report.farmerId)).size;
}

export type AlertStatus = "suggested" | "sent" | "dismissed";

export interface LatestAlert {
  status: AlertStatus;
  decidedAt?: number;
}

export type AlertSuggestionStep = "none" | "create" | "update";

export function nextSuggestionStep(farmCount: number, latest: LatestAlert | null, now: number): AlertSuggestionStep {
  if (latest?.status === "suggested") return "update";
  const decidedRecently = latest?.decidedAt !== undefined && now - latest.decidedAt < OUTBREAK_WINDOW_MS;
  if (decidedRecently) return "none";
  return farmCount >= OUTBREAK_MIN_FARMS ? "create" : "none";
}

const RESERVED_ALERT_CHARS = COMPLIANCE_OVERHEAD_CHARS + ALERT_FOOTER.length + 1;

function firstSentence(text: string): string {
  return /^.*?[.!?](\s|$)/.exec(text)?.[0].trim() ?? text;
}

export function draftAlertMessage(area: AlertArea, condition: AlertableCondition, farmCount: number): string {
  const disease = DISEASES[condition];
  const draft = `Leaf alert for ${area.name}: ${farmCount} farms near you reported ${disease.name.toLowerCase()} in the last 7 days. ${firstSentence(disease.look)} ${disease.actions[0]} If your trees have it, text us what you see.`;
  return fitToSms(draft, RESERVED_ALERT_CHARS);
}

export function alertSmsBody(officerText: string): string {
  return `${fitToSms(officerText.trim(), RESERVED_ALERT_CHARS)}\n${ALERT_FOOTER}`;
}
