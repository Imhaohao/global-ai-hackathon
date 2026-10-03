import { MODEL_CLASS_ORDER } from './conditions';
import modelConfig from '../../assets/model/model-config.json';
import type { Confidence, Diagnosis } from './classifyLeaf';

const MODEL_INPUT_SIZE = 224;

function confidenceFor(probability: number, index: number): Confidence {
  if (index >= MODEL_CLASS_ORDER.length) return 'unclear';
  if (probability >= modelConfig.calibration.confident_thresholds[index]) return 'confident';
  if (probability >= modelConfig.calibration.class_thresholds[index]) return 'possible';
  return 'unclear';
}

export function pickMostLikely(probabilities: Float32Array): Diagnosis {
  if (probabilities.length !== modelConfig.labels.length || !probabilities.every(Number.isFinite)) {
    throw new Error('The leaf model returned invalid probabilities');
  }
  let bestIndex = 0;
  probabilities.forEach((probability, index) => {
    if (probability > probabilities[bestIndex]) bestIndex = index;
  });
  const probability = probabilities[bestIndex];
  return {
    condition: MODEL_CLASS_ORDER[bestIndex] ?? 'healthy',
    probability,
    confidence: confidenceFor(probability, bestIndex),
  };
}

export function passesQuality(rgb: Float32Array): boolean {
  const size = MODEL_INPUT_SIZE;
  const gray = new Float32Array(size * size);
  let light = 0;
  for (let pixel = 0; pixel < gray.length; pixel++) {
    const offset = pixel * 3;
    gray[pixel] = Math.floor((19595 * rgb[offset] + 38470 * rgb[offset + 1] + 7471 * rgb[offset + 2] + 32768) / 65536);
    light += gray[pixel];
  }
  let sum = 0;
  let squares = 0;
  for (let row = 1; row < size - 1; row++) {
    for (let column = 1; column < size - 1; column++) {
      const i = row * size + column;
      const edge = 4 * gray[i] - gray[i - size] - gray[i + size] - gray[i - 1] - gray[i + 1];
      sum += edge;
      squares += edge * edge;
    }
  }
  const count = (size - 2) ** 2;
  const variance = squares / count - (sum / count) ** 2;
  const limits = modelConfig.calibration.quality;
  return variance >= limits.minimum_edge_variance && light / gray.length >= limits.minimum_mean_luminance;
}
