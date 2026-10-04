import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import type { TfliteModel } from 'react-native-fast-tflite';

import type { LeafCondition } from './conditions';
import { qualityIssueFor, type QualityIssue } from './imageQuality';
import type { ModelConfig } from './modelConfig';
import { pickMostLikely } from './modelDecision';
import { base64ToBytes, decodeExposurePng, rgbaToRgbFloatTensor } from './photoPixels';
import modelConfig from '../../assets/model/model-config.json';

const MODEL_INPUT_SIZE = 224;

export type Confidence = 'confident' | 'possible' | 'unclear';

export type LeafPhoto = { uri: string; width: number; height: number };

export type Diagnosis = {
  condition: LeafCondition;
  probability: number;
  confidence: Confidence;
  qualityPassed: boolean;
  qualityIssue?: QualityIssue;
};

async function preparePhoto(photo: LeafPhoto, config: ModelConfig) {
  const shortSide = Math.floor(MODEL_INPUT_SIZE / config.crop_pct);
  const scale = shortSide / Math.min(photo.width, photo.height);
  const width = Math.floor(photo.width * scale);
  const height = Math.floor(photo.height * scale);
  const context = ImageManipulator.manipulate(photo.uri)
    .resize({ width, height })
    .crop({
      originX: Math.round((width - MODEL_INPUT_SIZE) / 2),
      originY: Math.round((height - MODEL_INPUT_SIZE) / 2),
      width: MODEL_INPUT_SIZE,
      height: MODEL_INPUT_SIZE,
    });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
  const exposureImage = await image.saveAsync({ format: SaveFormat.PNG, base64: true });
  if (!saved.base64 || !exposureImage.base64) throw new Error('Image manipulator returned no base64 data');
  const decoded = jpeg.decode(base64ToBytes(saved.base64), { useTArray: true, formatAsRGBA: true });
  const input = rgbaToRgbFloatTensor(decoded.data);
  const exposure = decodeExposurePng(base64ToBytes(exposureImage.base64));
  return { input, qualityIssue: qualityIssueFor(input, exposure, config.calibration.quality.minimum_edge_variance) };
}

export async function classifyLeaf(model: TfliteModel, photo: LeafPhoto, config: ModelConfig = modelConfig): Promise<Diagnosis> {
  const { input, qualityIssue } = await preparePhoto(photo, config);
  const qualityPassed = qualityIssue === undefined;
  const started = performance.now();
  const [output] = await model.run([input.buffer as ArrayBuffer]);
  const inferenceMs = performance.now() - started;
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[leaf-model] inference_ms=${inferenceMs.toFixed(1)} quality=${qualityPassed}`);
  const diagnosis = pickMostLikely(new Float32Array(output), config);
  return {
    ...diagnosis,
    qualityPassed,
    confidence: qualityPassed ? diagnosis.confidence : 'unclear',
    ...(qualityIssue ? { qualityIssue } : {}),
  };
}
