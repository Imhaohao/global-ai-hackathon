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
