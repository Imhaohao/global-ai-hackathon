import { decode } from 'fast-png';

import type { ExposurePixels } from './imageQuality';

const SIZE = 224;

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function rgbaToRgbFloatTensor(rgba: Uint8Array): Float32Array {
  const pixelCount = SIZE * SIZE;
  if (rgba.length !== pixelCount * 4) throw new Error('Invalid photo dimensions');
  const tensor = new Float32Array(pixelCount * 3);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    tensor[pixel * 3] = rgba[pixel * 4];
    tensor[pixel * 3 + 1] = rgba[pixel * 4 + 1];
    tensor[pixel * 3 + 2] = rgba[pixel * 4 + 2];
  }
  return tensor;
}

export function decodeExposurePng(bytes: Uint8Array): ExposurePixels {
  const image = decode(bytes, { checkCrc: true });
  if (image.width !== SIZE || image.height !== SIZE || image.palette || image.transparency
    || ![8, 16].includes(image.depth) || ![1, 2, 3, 4].includes(image.channels)) {
    throw new Error('Unsupported rendered photo format');
  }
  const pixels = SIZE * SIZE;
  const rgb = new Float32Array(pixels * 3);
  const alpha = new Uint8Array(pixels);
  const divisor = image.depth === 16 ? 257 : 1;
  const hasAlpha = image.channels % 2 === 0;
  for (let pixel = 0; pixel < pixels; pixel++) {
    const offset = pixel * image.channels;
    for (let channel = 0; channel < 3; channel++) {
      const sourceChannel = image.channels < 3 ? 0 : channel;
      rgb[pixel * 3 + channel] = Math.round(image.data[offset + sourceChannel] / divisor);
    }
    alpha[pixel] = hasAlpha ? Math.round(image.data[offset + image.channels - 1] / divisor) : 255;
  }
  return { rgb, alpha };
}
