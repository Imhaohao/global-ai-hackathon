import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Observation, PlantCheck } from '../../../shared/src/contract.ts';
import type { DeviceLocation } from './deviceLocation';
import { copyIntoFolder, deleteTemporaryFile, listJsonFiles, readJson, writeJson } from './documentStore';

const OBSERVATIONS_FOLDER = 'observations';
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.6;

function newObservationId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function renderTemporaryThumbnail(sourceUri: string): Promise<string | null> {
  try {
    const rendered = await ImageManipulator.manipulate(sourceUri).resize({ width: THUMBNAIL_WIDTH }).renderAsync();
    const thumbnail = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL_QUALITY });
    return thumbnail.uri;
  } catch {
    return null;
  }
}

function keepPhotosOnPhone(observationId: string, check: PlantCheck, thumbnailUris: (string | null)[]): PlantCheck {
  const readings = check.readings.map((reading, index) => ({
    ...reading,
    photoUri: copyIntoFolder(thumbnailUris[index] ?? reading.photoUri, 'photos', observationId, `leaf-${index + 1}.jpg`),
  }));
  return { ...check, readings };
}

function locationFields(location: DeviceLocation | null) {
  if (!location) return {};
  return { latitude: location.latitude, longitude: location.longitude, accuracyMeters: location.accuracyMeters };
}

export function saveObservation(observation: Observation): void {
  writeJson(observation, OBSERVATIONS_FOLDER, `${observation.id}.json`);
}

export async function createObservation(
  check: PlantCheck,
  location: DeviceLocation | null,
  isStillCurrent: () => boolean,
): Promise<Observation | null> {
  const thumbnailUris = await Promise.all(check.readings.map((reading) => renderTemporaryThumbnail(reading.photoUri)));
  try {
    if (!isStillCurrent()) return null;
    const id = newObservationId();
    const observation: Observation = {
      id,
      capturedAt: check.checkedAt,
      ...locationFields(location),
      check: keepPhotosOnPhone(id, check, thumbnailUris),
      reviewStatus: 'unreviewed',
    };
    saveObservation(observation);
    return observation;
  } finally {
    thumbnailUris.forEach((uri) => uri && deleteTemporaryFile(uri));
  }
}

export function listObservations(): Observation[] {
  return listJsonFiles(OBSERVATIONS_FOLDER)
    .map((file) => readJson<Observation | null>(null, OBSERVATIONS_FOLDER, file.name))
    .filter((observation): observation is Observation => observation !== null)
    .sort((first, second) => second.capturedAt.localeCompare(first.capturedAt));
}
