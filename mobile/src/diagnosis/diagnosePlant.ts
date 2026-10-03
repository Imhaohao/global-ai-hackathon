import type { TfliteModel } from 'react-native-fast-tflite';

import type { PlantCheck } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from './classifyLeaf';

export const MAX_LEAVES_PER_PLANT = 6;
export const MIN_AGREEING_LEAVES = 3;

export async function diagnosePlant(model: TfliteModel, photos: LeafPhoto[]): Promise<PlantCheck> {
  void model;
  return {
    readings: [],
    verdict: { kind: 'needsPerson', reason: 'tooFewClearLeaves', usable: 0, total: photos.length },
    modelVersion: 'stub',
    checkedAt: new Date().toISOString(),
  };
}
