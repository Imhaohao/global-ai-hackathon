import type { TfliteModel } from 'react-native-fast-tflite';

import { MODEL_CLASS_ORDER } from './conditions';
import type { ModelConfig } from './modelConfig';

export type ModelLoadState =
  | { state: 'loading' }
  | { state: 'loaded'; model: TfliteModel }
  | { state: 'error' };

function validThresholds(config: ModelConfig): boolean {
  const { class_thresholds: accepts, confident_thresholds: confident } = config.calibration;
  return accepts.length === MODEL_CLASS_ORDER.length
    && confident.length === accepts.length
    && accepts.every((value, index) => Number.isFinite(value) && value >= 0
      && Number.isFinite(confident[index]) && confident[index] >= value);
}

function assertConfiguration(config: ModelConfig): void {
  const expectedLabels = ['cercospora', 'healthy', 'miner', 'phoma', 'rust', 'red_spider_mite', 'weevil_damage', 'unsupported'];
  if (config.labels.join(',') !== expectedLabels.join(',')
    || config.app_condition_keys.join(',') !== MODEL_CLASS_ORDER.join(',')
    || config.input !== 'float32 raw RGB 0..255 NHWC' || config.crop_pct !== 0.875
    || !validThresholds(config)
    || !Number.isFinite(config.calibration.quality.minimum_edge_variance)
    || config.calibration.quality.minimum_edge_variance < 0) throw new Error('Unsupported leaf model configuration');
}

export function assertModelContract(model: TfliteModel, config: ModelConfig): void {
  assertConfiguration(config);
  const [input] = model.inputs;
  const [output] = model.outputs;
  if (model.inputs.length !== 1 || input.dataType !== 'float32' || input.shape.join(',') !== '1,224,224,3'
    || model.outputs.length !== 1 || output.dataType !== 'float32' || output.shape.join(',') !== '1,8') {
    throw new Error('Unsupported leaf model tensors');
  }
}

export function loadModelSelection(
  load: () => Promise<TfliteModel>,
  config: ModelConfig,
  onState: (state: ModelLoadState) => void,
): () => void {
  let active = true;
  let ownedModel: TfliteModel | undefined;
  const releaseModel = () => {
    const model = ownedModel;
    ownedModel = undefined;
    model?.dispose();
  };
  onState({ state: 'loading' });
  void load().then((model) => {
    ownedModel = model;
    if (!active) return releaseModel();
    try {
      assertModelContract(model, config);
      onState({ state: 'loaded', model });
    } catch {
      releaseModel();
      onState({ state: 'error' });
    }
  }).catch(() => {
    if (active) onState({ state: 'error' });
  });
  return () => {
    active = false;
    releaseModel();
  };
}
