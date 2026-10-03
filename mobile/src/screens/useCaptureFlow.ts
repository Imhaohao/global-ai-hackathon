import { useCallback, useState } from 'react';
import type { TfliteModel } from 'react-native-fast-tflite';

import type { PlantCheck } from '../../../shared/src/contract.ts';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { diagnosePlant, MAX_LEAVES_PER_PLANT } from '../diagnosis/diagnosePlant';
import { pickLeafPhoto, type PhotoSource } from '../diagnosis/pickLeafPhoto';
import type { CaptureProblem } from './CaptureScreen';
import { buildDevCheck, type DevScenario } from './devVerdictOverride';

type CaptureState = { photos: LeafPhoto[]; check: PlantCheck | null; isChecking: boolean; problem?: CaptureProblem };

const EMPTY_CAPTURE: CaptureState = { photos: [], check: null, isChecking: false };

function checkPhotos(model: TfliteModel, photos: LeafPhoto[], scenario: DevScenario): Promise<PlantCheck> {
  if (__DEV__ && scenario !== 'off') return Promise.resolve(buildDevCheck(scenario, photos));
  return diagnosePlant(model, photos);
}

function withPhoto(photos: LeafPhoto[], photo: LeafPhoto, replaceIndex?: number): LeafPhoto[] {
  if (replaceIndex === undefined) return [...photos, photo];
  return photos.map((existing, index) => (index === replaceIndex ? photo : existing));
}

export function useCaptureFlow(model: TfliteModel | undefined, scenario: DevScenario) {
  const [state, setState] = useState<CaptureState>(EMPTY_CAPTURE);

  const takeLeaf = useCallback(
    async (source: PhotoSource, replaceIndex?: number) => {
      if (!model || state.isChecking) return;
      if (replaceIndex === undefined && state.photos.length >= MAX_LEAVES_PER_PLANT) return;
      const picked = await pickLeafPhoto(source);
      if (picked.kind === 'cancelled') return;
      if (picked.kind === 'cameraBlocked') return setState({ ...state, problem: 'cameraBlocked' });
      const photos = withPhoto(state.photos, picked.photo, replaceIndex);
      setState({ ...state, photos, isChecking: true, problem: undefined });
      try {
        const check = await checkPhotos(model, photos, scenario);
        setState({ photos, check, isChecking: false });
      } catch {
        setState({ photos: state.photos, check: state.check, isChecking: false, problem: 'photoFailed' });
      }
    },
    [model, scenario, state],
  );

  const startOver = useCallback(() => setState(EMPTY_CAPTURE), []);

  return { ...state, takeLeaf, startOver };
}
