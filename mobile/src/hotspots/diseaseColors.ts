import type { DiseaseKey } from '../../../shared/src/index.ts';
import { colors } from '../theme';

export const DISEASE_COLORS: Record<DiseaseKey, string> = {
  rust: colors['disease-rust'],
  cercospora: colors['disease-cercospora'],
  miner: colors['disease-miner'],
  phoma: colors['disease-phoma'],
  mites: colors['disease-mites'],
  weevil: colors['disease-weevil'],
  healthy: colors['ink-muted'],
};

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextOn(background: string): string {
  return contrastRatio(background, colors.surface) >= contrastRatio(background, colors.ink) ? colors.surface : colors.ink;
}
