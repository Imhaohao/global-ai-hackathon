import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import type { TfliteModel } from 'react-native-fast-tflite';

import { MODEL_CLASS_ORDER, type LeafCondition } from './conditions';

const MODEL_INPUT_SIZE = 224;
const CONFIDENT_THRESHOLD = 0.75;
const UNCLEAR_THRESHOLD = 0.5;

export type Confidence = 'confident' | 'possible' | 'unclear';

export type LeafPhoto = { uri: string; width: number; height: number };

export type Diagnosis = {
  condition: LeafCondition;
  probability: number;
  confidence: Confidence;
};

async function cropAndResizeToJpegBase64(photo: LeafPhoto): Promise<string> {
  const side = Math.min(photo.width, photo.height);
  const context = ImageManipulator.manipulate(photo.uri)
    .crop({
      originX: Math.floor((photo.width - side) / 2),
      originY: Math.floor((photo.height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
  if (!saved.base64) throw new Error('Image manipulator returned no base64 data');
  return saved.base64;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function rgbaToRgbFloatTensor(rgba: Uint8Array): Float32Array {
  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const tensor = new Float32Array(pixelCount * 3);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    tensor[pixel * 3] = rgba[pixel * 4];
    tensor[pixel * 3 + 1] = rgba[pixel * 4 + 1];
    tensor[pixel * 3 + 2] = rgba[pixel * 4 + 2];
  }
  return tensor;
}

function confidenceFor(probability: number): Confidence {
  if (probability >= CONFIDENT_THRESHOLD) return 'confident';
  if (probability >= UNCLEAR_THRESHOLD) return 'possible';
  return 'unclear';
}

function pickMostLikely(probabilities: Float32Array): Diagnosis {
  let bestIndex = 0;
  probabilities.forEach((probability, index) => {
    if (probability > probabilities[bestIndex]) bestIndex = index;
  });
  const probability = probabilities[bestIndex];
  return {
    condition: MODEL_CLASS_ORDER[bestIndex],
    probability,
    confidence: confidenceFor(probability),
  };
}

export async function classifyLeaf(model: TfliteModel, photo: LeafPhoto): Promise<Diagnosis> {
  const jpegBase64 = await cropAndResizeToJpegBase64(photo);
  const decoded = jpeg.decode(base64ToBytes(jpegBase64), { useTArray: true, formatAsRGBA: true });
  const input = rgbaToRgbFloatTensor(decoded.data);
  const [output] = await model.run([input.buffer as ArrayBuffer]);
  return pickMostLikely(new Float32Array(output));
}
