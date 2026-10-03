import type { LeafReading, PlantVerdict } from "./contract.ts";
import type { DiseaseKey } from "./types.ts";

export const MAX_LEAVES_PER_PLANT = 6;
export const MIN_AGREEING_LEAVES = 3;
export const MIN_AGREEING_SHARE = 0.6;

interface ConditionVotes {
  condition: DiseaseKey;
  votes: number;
}

export function isUsableReading(reading: LeafReading): boolean {
  return reading.qualityPassed && reading.confidence !== "unclear";
}

function rankConditionsByVotes(readings: LeafReading[]): ConditionVotes[] {
  const votesByCondition = new Map<DiseaseKey, number>();
  for (const reading of readings) {
    votesByCondition.set(reading.condition, (votesByCondition.get(reading.condition) ?? 0) + 1);
  }
  return [...votesByCondition]
    .map(([condition, votes]) => ({ condition, votes }))
    .sort((first, second) => second.votes - first.votes);
}

function isClearWinner(ranked: ConditionVotes[], usable: number): boolean {
  const [leader, runnerUp] = ranked;
  if (runnerUp && runnerUp.votes === leader.votes) return false;
  return leader.votes >= MIN_AGREEING_LEAVES && leader.votes / usable >= MIN_AGREEING_SHARE;
}

export function voteOnPlant(readings: LeafReading[]): PlantVerdict {
  const total = readings.length;
  const usableReadings = readings.filter(isUsableReading);
  const usable = usableReadings.length;

  if (usable < MIN_AGREEING_LEAVES) {
    return total < MAX_LEAVES_PER_PLANT
      ? { kind: "retake", usable, total }
      : { kind: "needsPerson", reason: "tooFewClearLeaves", usable, total };
  }

  const ranked = rankConditionsByVotes(usableReadings);
  if (!isClearWinner(ranked, usable)) {
    return { kind: "needsPerson", reason: "leavesDisagree", usable, total };
  }
  return { kind: "answer", condition: ranked[0].condition, agreeing: ranked[0].votes, usable, total };
}
