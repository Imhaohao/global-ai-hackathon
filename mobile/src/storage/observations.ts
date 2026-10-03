import type { Observation, PlantCheck } from '../../../shared/src/contract.ts';
import type { DeviceLocation } from './deviceLocation';
import { copyIntoFolder, listJsonFiles, readJson, writeJson } from './documentStore';

const OBSERVATIONS_FOLDER = 'observations';

function newObservationId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function keepPhotosOnPhone(observationId: string, check: PlantCheck): PlantCheck {
  const readings = check.readings.map((reading, index) => ({
    ...reading,
    photoUri: copyIntoFolder(reading.photoUri, 'photos', observationId, `leaf-${index + 1}.jpg`),
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

export function createObservation(check: PlantCheck, location: DeviceLocation | null): Observation {
  const id = newObservationId();
  const observation: Observation = {
    id,
    capturedAt: check.checkedAt,
    ...locationFields(location),
    check: keepPhotosOnPhone(id, check),
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
