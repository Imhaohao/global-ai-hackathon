import brightnessConfig from '../../assets/model/brightness-config.json';
import modelConfig from '../../assets/model/model-config.json';

const SIZE = 224;
const PIXELS = SIZE * SIZE;

export type QualityIssue = 'too_dark' | 'too_bright' | 'blurred' | 'no_visible_pixels';
export type ExposurePixels = { rgb: Float32Array; alpha?: Uint8Array };
export type ExposureMetrics = { meanLuminance: number; highlightFraction: number; visibleWeight: number };

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

export function measureExposure({ rgb, alpha }: ExposurePixels): ExposureMetrics {
  if (alpha && alpha.length !== PIXELS) throw new Error('Invalid photo transparency');
  const gray = grayscale(rgb);
  let light = 0;
  let highlights = 0;
  let visibleWeight = 0;
  for (let pixel = 0; pixel < PIXELS; pixel++) {
    const weight = alpha ? alpha[pixel] / 255 : 1;
    visibleWeight += weight;
    light += gray[pixel] * weight;
    if (gray[pixel] >= brightnessConfig.highlight_luminance) highlights += weight;
  }
  return {
    meanLuminance: visibleWeight ? light / visibleWeight : 0,
    highlightFraction: visibleWeight ? highlights / visibleWeight : 0,
    visibleWeight,
  };
}

export function exposureIssue(metrics: ExposureMetrics): QualityIssue | undefined {
  if (metrics.visibleWeight === 0) return 'no_visible_pixels';
  if (metrics.meanLuminance < brightnessConfig.minimum_mean_luminance) return 'too_dark';
  if (metrics.meanLuminance > brightnessConfig.maximum_mean_luminance
    && metrics.highlightFraction > brightnessConfig.maximum_highlight_fraction) return 'too_bright';
  return undefined;
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
  exposure: ExposurePixels = { rgb },
  minimumEdgeVariance = modelConfig.calibration.quality.minimum_edge_variance,
): QualityIssue | undefined {
  const brightnessIssue = exposureIssue(measureExposure(exposure));
  if (brightnessIssue) return brightnessIssue;
  if (edgeVariance(rgb) < minimumEdgeVariance) return 'blurred';
  return undefined;
}

export function passesQuality(rgb: Float32Array, exposure?: ExposurePixels): boolean {
  return qualityIssueFor(rgb, exposure) === undefined;
}
