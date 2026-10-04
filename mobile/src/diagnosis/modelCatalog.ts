import b0Config from '../../assets/model/model-config.json';
import b1Config from '../../assets/model/model-config-b1.json';
import b2Config from '../../assets/model/model-config-b2.json';
import type { ModelConfig, ModelId } from './modelConfig';

type ModelEntry = { asset: number; config: ModelConfig };

export const MODEL_CATALOG: Record<ModelId, ModelEntry> = {
  b0: {
    // Metro requires a literal asset path to package each offline model.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    asset: require('../../assets/model/coffee-leaf.tflite'),
    config: b0Config,
  },
  b1: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    asset: require('../../assets/model/coffee-leaf-b1.tflite'),
    config: b1Config,
  },
  b2: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    asset: require('../../assets/model/coffee-leaf-b2.tflite'),
    config: b2Config,
  },
};
