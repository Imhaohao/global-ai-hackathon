import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Observation, PlantCheck } from '../../../shared/src/contract.ts';
import type { DeviceLocation } from './deviceLocation';
import { copyIntoFolder, deleteFile, listJsonFiles, readJson, writeJson } from './documentStore';

const OBSERVATIONS_FOLDER = 'observations';
const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 0.6;

function newObservationId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function keepThumbnail(sourceUri: string, observationId: string, leafNumber: number): Promise<string> {
  try {
    const rendered = await ImageManipulator.manipulate(sourceUri).resize({ width: THUMBNAIL_WIDTH }).renderAsync();
    const thumbnail = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL_QUALITY });
    const keptUri = copyIntoFolder(thumbnail.uri, 'photos', observationId, `leaf-${leafNumber}.jpg`);
    deleteFile(thumbnail.uri);
    return keptUri;
  } catch {
    return sourceUri;
  }
}

async function keepThumbnailsOnPhone(observationId: string, check: PlantCheck): Promise<PlantCheck> {
  const readings = await Promise.all(
    check.readings.map(async (reading, index) => ({
      ...reading,
      photoUri: await keepThumbnail(reading.photoUri, observationId, index + 1),
    })),
  );
  return { ...check, readings };
}

function locationFields(location: DeviceLocation | null) {
  if (!location) return {};
  return { latitude: location.latitude, longitude: location.longitude, accuracyMeters: location.accuracyMeters };
}

export function saveObservation(observation: Observation): void {
  writeJson(observation, OBSERVATIONS_FOLDER, `${observation.id}.json`);
}

export async function createObservation(check: PlantCheck, location: DeviceLocation | null): Promise<Observation> {
  const id = newObservationId();
  const observation: Observation = {
    id,
    capturedAt: check.checkedAt,
    ...locationFields(location),
    check: await keepThumbnailsOnPhone(id, check),
    reviewStatus: 'unreviewed',
  };
  saveObservation(observation);
  return observation;
}

export function listObservations(): Observation[] {
  return listJsonFiles(OBSERVATIONS_FOLDER)
    .map((file) => readJson<Observation | null>(null, OBSERVATIONS_FOLDER, file.name))
    .filter((observation): observation is Observation => observation !== null)
    .sort((first, second) => second.capturedAt.localeCompare(first.capturedAt));
}
