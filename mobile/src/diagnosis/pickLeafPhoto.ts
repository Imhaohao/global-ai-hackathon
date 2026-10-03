import * as ImagePicker from 'expo-image-picker';

import type { LeafPhoto } from './classifyLeaf';

export type PhotoSource = 'camera' | 'library';

export type PickResult = { kind: 'photo'; photo: LeafPhoto } | { kind: 'cancelled' } | { kind: 'cameraBlocked' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  exif: false,
};

async function launchCamera(): Promise<ImagePicker.ImagePickerResult | 'blocked'> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return 'blocked';
  return ImagePicker.launchCameraAsync(PICKER_OPTIONS);
}

export async function pickLeafPhoto(source: PhotoSource): Promise<PickResult> {
  const result = source === 'camera' ? await launchCamera() : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result === 'blocked') return { kind: 'cameraBlocked' };
  if (result.canceled) return { kind: 'cancelled' };
  const [asset] = result.assets;
  return { kind: 'photo', photo: { uri: asset.uri, width: asset.width, height: asset.height } };
}
