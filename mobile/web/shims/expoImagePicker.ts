// Browser stand-in for the expo-image-picker calls in pickLeafPhoto. Each request opens the demo
// shell's photo sheet, which offers sample leaves or falls through to the browser's file picker.
import * as BrowserPicker from 'expo-image-picker';

import { requestPhoto, type PhotoSource } from '../photoRequest';

type PickerOptions = BrowserPicker.ImagePickerOptions;

export async function requestCameraPermissionsAsync() {
  return { granted: true, status: 'granted', canAskAgain: true, expires: 'never' } as const;
}

async function pick(source: PhotoSource): Promise<BrowserPicker.ImagePickerResult> {
  const photo = await requestPhoto(source);
  if (!photo) return { canceled: true, assets: null };
  return { canceled: false, assets: [{ ...photo, type: 'image' }] };
}

export function launchCameraAsync(_options?: PickerOptions) {
  return pick('camera');
}

export function launchImageLibraryAsync(_options?: PickerOptions) {
  return pick('library');
}
