import { useCallback, useEffect, useRef, useState } from 'react';
import type { TfliteModel } from 'react-native-fast-tflite';

import type { PlantCheck } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { diagnosePlant, MAX_LEAVES_PER_PLANT } from '../diagnosis/diagnosePlant';
import type { ModelConfig } from '../diagnosis/modelConfig';
import { pickLeafPhoto, type PhotoSource } from '../diagnosis/pickLeafPhoto';
import type { CaptureProblem } from './CaptureScreen';
import { buildDevCheck, type DevScenario } from './devVerdictOverride';

type CaptureState = { photos: LeafPhoto[]; check: PlantCheck | null; isChecking: boolean; problem?: CaptureProblem };

const EMPTY_CAPTURE: CaptureState = { photos: [], check: null, isChecking: false };

function checkPhotos(model: TfliteModel, photos: LeafPhoto[], scenario: DevScenario, config: ModelConfig): Promise<PlantCheck> {
  if (__DEV__ && scenario !== 'off') return Promise.resolve(buildDevCheck(scenario, photos));
  return diagnosePlant(model, photos, config);
}

function withPhoto(photos: LeafPhoto[], photo: LeafPhoto, replaceIndex?: number): LeafPhoto[] {
  if (replaceIndex === undefined) return [...photos, photo];
  return photos.map((existing, index) => (index === replaceIndex ? photo : existing));
}

export function useCaptureFlow(model: TfliteModel | undefined, scenario: DevScenario, config: ModelConfig) {
  const [state, setState] = useState<CaptureState>(EMPTY_CAPTURE);
  const busy = useRef(false);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);

  const takeLeaf = useCallback(
    async (source: PhotoSource, replaceIndex?: number) => {
      if (!model || busy.current) return;
      if (replaceIndex === undefined && state.photos.length >= MAX_LEAVES_PER_PLANT) return;
      busy.current = true;
      const request = ++requestId.current;
      setState({ ...state, isChecking: true, problem: undefined });
      try {
        const picked = await pickLeafPhoto(source);
        if (request !== requestId.current) return;
        if (picked.kind === 'cancelled') return setState(state);
        if (picked.kind === 'cameraBlocked') return setState({ ...state, problem: 'cameraBlocked' });
        const photos = withPhoto(state.photos, picked.photo, replaceIndex);
        setState({ ...state, photos, isChecking: true, problem: undefined });
        const check = await checkPhotos(model, photos, scenario, config);
        if (request === requestId.current) setState({ photos, check, isChecking: false });
      } catch {
        if (request === requestId.current) setState({ ...state, isChecking: false, problem: 'photoFailed' });
      } finally {
        busy.current = false;
      }
    },
    [model, scenario, state, config],
  );

  const startOver = useCallback(() => {
    if (!busy.current) setState(EMPTY_CAPTURE);
  }, []);
  const isBusy = useCallback(() => busy.current, []);

  return { ...state, takeLeaf, startOver, isBusy };
}
