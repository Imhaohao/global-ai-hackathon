import { DISEASE_KEYS, DISEASES, type DiseaseKey, type Urgency } from '../../../shared/src/index.ts';

export const MODEL_CLASS_ORDER = DISEASE_KEYS;

export type LeafCondition = DiseaseKey;

export type Severity = 'healthy' | 'watch' | 'sick';

const SEVERITY_BY_URGENCY: Record<Urgency, Severity> = {
  none: 'healthy',
  low: 'watch',
  medium: 'watch',
  high: 'sick',
};

export function severityOf(condition: LeafCondition): Severity {
  return SEVERITY_BY_URGENCY[DISEASES[condition].urgency];
}
