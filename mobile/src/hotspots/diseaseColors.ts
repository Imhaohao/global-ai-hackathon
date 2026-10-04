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
