import type { LeafReading, PlantVerdict } from '../../../shared/src/contract.ts';

export type LeafMark = 'agrees' | 'differs' | 'unusable' | 'clear';

export function isUsableReading(reading: LeafReading): boolean {
  return reading.qualityPassed && reading.confidence !== 'unclear';
}

export function leafMarkOf(reading: LeafReading, verdict: PlantVerdict): LeafMark {
  if (!isUsableReading(reading)) return 'unusable';
  if (verdict.kind !== 'answer') return 'clear';
  return reading.condition === verdict.condition ? 'agrees' : 'differs';
}

export type LeafProblem = 'blurry' | 'notClear';

export function leafProblemOf(reading: LeafReading): LeafProblem | null {
  if (!reading.qualityPassed) return 'blurry';
  return reading.confidence === 'unclear' ? 'notClear' : null;
}
