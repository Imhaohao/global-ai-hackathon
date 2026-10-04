import type { LeafCondition } from './conditions';

export type ModelId = 'b0' | 'b1' | 'b2';

export type ModelConfig = {
  labels: string[];
  app_condition_keys: string[];
  input: string;
  crop_pct: number;
  calibration: {
    version: string;
    artifact_sha256: string;
    class_thresholds: number[];
    confident_thresholds: number[];
    quality: { minimum_edge_variance: number };
  };
};

export const MODEL_NAMES: Record<ModelId, string> = {
  b0: 'EfficientNet B0',
  b1: 'EfficientNet B1',
  b2: 'EfficientNet B2',
};

export const DEFAULT_MODEL_ID: ModelId = 'b0';
export const MODEL_IDS: ModelId[] = ['b0', 'b1', 'b2'];

export function conditionFor(config: ModelConfig, index: number): LeafCondition {
  return (config.app_condition_keys[index] as LeafCondition | undefined) ?? 'healthy';
}
