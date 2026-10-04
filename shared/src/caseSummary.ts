import type { CaseSummaryInput, FarmDecision, Observation, PlantVerdict, WetDays } from "./contract.ts";
import { DISEASES } from "./diseases.ts";
import { fitToSms } from "./smsReply.ts";
import { isFreshWetDays } from "./wetDays.ts";

const MAX_FARM_SECTION_CHARS = 30;
const GPS_DECIMALS = 5;

const DECISION_LABELS: Record<FarmDecision, string> = {
  spray: "spray (copper, label rate)",
  pruneAndClean: "prune and clean",
  monitor: "monitor",
  callOfficer: "needs your visit",
};

function verdictText(verdict: PlantVerdict): string {
  if (verdict.kind === "answer") {
    return `${DISEASES[verdict.condition].name}, ${verdict.agreeing} of ${verdict.usable} clear leaves agree`;
  }
  if (verdict.kind === "retake") {
    return `no answer yet, ${verdict.usable} of ${verdict.total} leaves clear enough`;
  }
  const reason = verdict.reason === "leavesDisagree" ? "leaves disagree" : "too few clear leaves";
  return `not sure, ${reason}, ${verdict.usable} of ${verdict.total} leaves clear enough`;
}

function locationText(observation: Observation): string | null {
  const { latitude, longitude, accuracyMeters } = observation;
  if (latitude === undefined || longitude === undefined) return null;
  const point = `${latitude.toFixed(GPS_DECIMALS)},${longitude.toFixed(GPS_DECIMALS)}`;
  return accuracyMeters === undefined ? `GPS ${point}` : `GPS ${point} (within ${Math.round(accuracyMeters)} m)`;
}

function sectionText(observation: Observation): string | null {
  const section = observation.farmSection?.trim();
  return section ? `Section: ${section.slice(0, MAX_FARM_SECTION_CHARS)}` : null;
}

function rainText(wetDays: WetDays | undefined): string | null {
  return isFreshWetDays(wetDays)
    ? `Rain: ${wetDays.wetDaysLast7} wet days in 7 ending ${wetDays.asOf} (${wetDays.source})`
    : null;
}

export function formatCaseSummarySms(input: CaseSummaryInput): string {
  const { observation, card, wetDays } = input;
  const parts = [
    `Leaf Doctor case ${observation.id}, ${observation.capturedAt.slice(0, 10)}`,
    sectionText(observation),
    locationText(observation),
    `Result: ${verdictText(observation.check.verdict)}`,
    `Decision: ${DECISION_LABELS[card.decision]}`,
    rainText(wetDays),
    `Model ${observation.check.modelVersion}`,
  ];
  return fitToSms(parts.filter((part) => part !== null).join(". ") + ".");
}
