import type { TfliteModel } from 'react-native-fast-tflite';

import type { LeafReading, PlantCheck } from '../../../shared/src/contract.ts';
import { MAX_LEAVES_PER_PLANT, MIN_AGREEING_LEAVES, voteOnPlant } from '../../../shared/src/plantVote.ts';
import modelConfig from '../../assets/model/model-config.json';
import { classifyLeaf, type Diagnosis, type LeafPhoto } from './classifyLeaf';

export { MAX_LEAVES_PER_PLANT, MIN_AGREEING_LEAVES };

export const MODEL_VERSION = `${modelConfig.calibration.version}+${modelConfig.calibration.artifact_sha256.slice(0, 12)}`;

// classifyLeaf may not report qualityPassed yet; until it does, a failed quality gate shows up as 'unclear'.
type DiagnosisWithQuality = Diagnosis & { qualityPassed?: boolean };

function toLeafReading(photo: LeafPhoto, diagnosis: DiagnosisWithQuality): LeafReading {
  return {
    photoUri: photo.uri,
    condition: diagnosis.condition,
    probability: diagnosis.probability,
    confidence: diagnosis.confidence,
    qualityPassed: diagnosis.qualityPassed ?? diagnosis.confidence !== 'unclear',
  };
}

export async function diagnosePlant(model: TfliteModel, photos: LeafPhoto[]): Promise<PlantCheck> {
  const readings: LeafReading[] = [];
  for (const photo of photos.slice(0, MAX_LEAVES_PER_PLANT)) {
    readings.push(toLeafReading(photo, await classifyLeaf(model, photo)));
  }
  return {
    readings,
    verdict: voteOnPlant(readings),
    modelVersion: MODEL_VERSION,
    checkedAt: new Date().toISOString(),
  };
}
