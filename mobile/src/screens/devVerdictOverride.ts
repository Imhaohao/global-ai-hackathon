import type { LeafReading, PlantCheck, PlantVerdict } from '../../../shared/src/contract.ts';
import type { DiseaseKey } from '../../../shared/src/types.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { MAX_LEAVES_PER_PLANT, MIN_AGREEING_LEAVES } from '../../../shared/src/plantVote.ts';

export type DevScenario = 'off' | 'clear' | 'unclear' | 'disagree';

export const DEV_SCENARIOS: DevScenario[] = ['off', 'clear', 'unclear', 'disagree'];

const DISAGREEING_CONDITIONS: DiseaseKey[] = ['rust', 'cercospora', 'miner'];

type ReadingShape = Pick<LeafReading, 'condition' | 'qualityPassed' | 'confidence'>;

const READING_BY_SCENARIO: Record<Exclude<DevScenario, 'off'>, (index: number) => ReadingShape> = {
  clear: () => ({ condition: 'rust', qualityPassed: true, confidence: 'confident' }),
  unclear: (index) => ({ condition: 'healthy', qualityPassed: index % 2 === 1, confidence: 'unclear' }),
  disagree: (index) => ({
    condition: DISAGREEING_CONDITIONS[index % DISAGREEING_CONDITIONS.length],
    qualityPassed: true,
    confidence: 'confident',
  }),
};

function verdictFor(scenario: Exclude<DevScenario, 'off'>, readings: LeafReading[]): PlantVerdict {
  const total = readings.length;
  const usable = readings.filter((reading) => reading.qualityPassed && reading.confidence !== 'unclear').length;
  if (usable < MIN_AGREEING_LEAVES) {
    return total < MAX_LEAVES_PER_PLANT
      ? { kind: 'retake', usable, total }
      : { kind: 'needsPerson', reason: 'tooFewClearLeaves', usable, total };
  }
  if (scenario === 'clear') return { kind: 'answer', condition: 'rust', agreeing: usable, usable, total };
  return { kind: 'needsPerson', reason: 'leavesDisagree', usable, total };
}

export function buildDevCheck(scenario: Exclude<DevScenario, 'off'>, photos: LeafPhoto[]): PlantCheck {
  const readings: LeafReading[] = photos.map((photo, index) => ({
    photoUri: photo.uri,
    probability: 0.9,
    ...READING_BY_SCENARIO[scenario](index),
  }));
  return {
    readings,
    verdict: verdictFor(scenario, readings),
    modelVersion: 'development-override',
    checkedAt: new Date().toISOString(),
  };
}
