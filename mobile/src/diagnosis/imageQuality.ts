import modelConfig from '../../assets/model/model-config.json';

const SIZE = 224;
const PIXELS = SIZE * SIZE;

export type QualityIssue = 'blurred';

function grayscale(rgb: Float32Array): Float32Array {
  if (rgb.length !== PIXELS * 3 || !rgb.every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
    throw new Error('Invalid photo pixels');
  }
  const gray = new Float32Array(PIXELS);
  for (let pixel = 0; pixel < PIXELS; pixel++) {
    const i = pixel * 3;
    gray[pixel] = Math.floor((19595 * rgb[i] + 38470 * rgb[i + 1] + 7471 * rgb[i + 2] + 32768) / 65536);
  }
  return gray;
}

function edgeVariance(rgb: Float32Array): number {
  const gray = grayscale(rgb);
  let sum = 0;
  let squares = 0;
  for (let row = 1; row < SIZE - 1; row++) {
    for (let column = 1; column < SIZE - 1; column++) {
      const i = row * SIZE + column;
      const edge = 4 * gray[i] - gray[i - SIZE] - gray[i + SIZE] - gray[i - 1] - gray[i + 1];
      sum += edge;
      squares += edge * edge;
    }
  }
  const count = (SIZE - 2) ** 2;
  return squares / count - (sum / count) ** 2;
}

export function qualityIssueFor(
  rgb: Float32Array,
  minimumEdgeVariance = modelConfig.calibration.quality.minimum_edge_variance,
): QualityIssue | undefined {
  return edgeVariance(rgb) < minimumEdgeVariance ? 'blurred' : undefined;
}

export function passesQuality(rgb: Float32Array): boolean {
  return qualityIssueFor(rgb) === undefined;
}
