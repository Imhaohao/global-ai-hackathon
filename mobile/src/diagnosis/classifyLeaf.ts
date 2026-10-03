import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import type { TfliteModel } from 'react-native-fast-tflite';

import type { LeafCondition } from './conditions';
import { passesQuality, pickMostLikely } from './modelDecision';
import modelConfig from '../../assets/model/model-config.json';

const MODEL_INPUT_SIZE = 224;

export type Confidence = 'confident' | 'possible' | 'unclear';

export type LeafPhoto = { uri: string; width: number; height: number };

export type Diagnosis = {
  condition: LeafCondition;
  probability: number;
  confidence: Confidence;
};

async function cropAndResizeToJpegBase64(photo: LeafPhoto): Promise<string> {
  const shortSide = Math.floor(MODEL_INPUT_SIZE / modelConfig.crop_pct);
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

export async function classifyLeaf(model: TfliteModel, photo: LeafPhoto): Promise<Diagnosis> {
  const jpegBase64 = await cropAndResizeToJpegBase64(photo);
  const decoded = jpeg.decode(base64ToBytes(jpegBase64), { useTArray: true, formatAsRGBA: true });
  const input = rgbaToRgbFloatTensor(decoded.data);
  const [output] = await model.run([input.buffer as ArrayBuffer]);
  const diagnosis = pickMostLikely(new Float32Array(output));
  return passesQuality(input) ? diagnosis : { ...diagnosis, confidence: 'unclear' };
}
