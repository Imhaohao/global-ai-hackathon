import { useEffect, useState } from 'react';
import { loadTensorflowModel } from 'react-native-fast-tflite';

import { loadModelSelection, type ModelLoadState } from './loadModelSelection';
import { MODEL_CATALOG } from './modelCatalog';
import type { ModelId } from './modelConfig';

type SelectionState = { modelId: ModelId; attempt: number; load: ModelLoadState };

export function useLeafModel(modelId: ModelId) {
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<SelectionState>({ modelId, attempt, load: { state: 'loading' } });
  const entry = MODEL_CATALOG[modelId];

  useEffect(() => loadModelSelection(
    () => loadTensorflowModel(entry.asset, []),
    entry.config,
    (load) => setSelection({ modelId, attempt, load }),
  ), [entry, modelId, attempt]);

  const load = selection.modelId === modelId && selection.attempt === attempt
    ? selection.load : { state: 'loading' as const };
  return { load, config: entry.config, retry: () => setAttempt((value) => value + 1) };
}
