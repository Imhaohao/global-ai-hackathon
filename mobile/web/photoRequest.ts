import { useSyncExternalStore } from 'react';

export type PhotoSource = 'camera' | 'library';

export type PickedPhoto = { uri: string; width: number; height: number };

export type PhotoRequest = {
  source: PhotoSource;
  settle: (photo: PickedPhoto | null | Promise<PickedPhoto | null>) => void;
};

let current: PhotoRequest | null = null;
const listeners = new Set<() => void>();

function publish(next: PhotoRequest | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

// The image-picker shim calls this; the demo shell answers it with a sample or the browser's own picker.
export function requestPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  current?.settle(null);
  return new Promise((resolve) => {
    publish({
      source,
      settle: (photo) => {
        publish(null);
        resolve(photo);
      },
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePhotoRequest(): PhotoRequest | null {
  return useSyncExternalStore(subscribe, () => current);
}
