import modelConfig from '../../assets/model/model-config.json';
import type { Confidence, Diagnosis } from './classifyLeaf';
import { conditionFor, type ModelConfig } from './modelConfig';

export { passesQuality } from './imageQuality';

function confidenceFor(probability: number, index: number, config: ModelConfig): Confidence {
  if (index >= config.app_condition_keys.length) return 'unclear';
  if (probability >= config.calibration.confident_thresholds[index]) return 'confident';
  if (probability >= config.calibration.class_thresholds[index]) return 'possible';
  return 'unclear';
}

export function pickMostLikely(probabilities: Float32Array, config: ModelConfig = modelConfig): Omit<Diagnosis, 'qualityPassed'> {
  if (probabilities.length !== config.labels.length || !probabilities.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error('The leaf model returned invalid probabilities');
  }
  let bestIndex = 0;
  probabilities.forEach((probability, index) => {
    if (probability > probabilities[bestIndex]) bestIndex = index;
  });
  const probability = probabilities[bestIndex];
  return {
    condition: conditionFor(config, bestIndex),
    probability,
    confidence: confidenceFor(probability, bestIndex, config),
  };
}
