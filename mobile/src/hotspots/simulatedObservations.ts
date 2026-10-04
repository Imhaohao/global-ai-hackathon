import type { Observation, PlantVerdict } from '../../../shared/src/contract.ts';
import type { DiseaseKey } from '../../../shared/src/index.ts';

const FARM_LATITUDE = -0.4167;
const FARM_LONGITUDE = 36.95;
const METERS_PER_DEGREE = 111_320;
const MILLISECONDS_PER_DAY = 86_400_000;

type Place = { condition: DiseaseKey; eastMeters: number; northMeters: number; checks: number; weeksSpread: number };

const PLACES: Place[] = [
  { condition: 'rust', eastMeters: 40, northMeters: 30, checks: 9, weeksSpread: 7 },
  { condition: 'rust', eastMeters: -90, northMeters: -60, checks: 3, weeksSpread: 3 },
  { condition: 'cercospora', eastMeters: -40, northMeters: 70, checks: 4, weeksSpread: 6 },
  { condition: 'miner', eastMeters: 110, northMeters: -50, checks: 2, weeksSpread: 4 },
  { condition: 'phoma', eastMeters: -120, northMeters: 20, checks: 2, weeksSpread: 2 },
  { condition: 'weevil', eastMeters: 20, northMeters: -110, checks: 1, weeksSpread: 1 },
  { condition: 'healthy', eastMeters: 130, northMeters: 60, checks: 1, weeksSpread: 1 },
];

function verdictFor(condition: DiseaseKey): PlantVerdict {
  return { kind: 'answer', condition, agreeing: 4, usable: 5, total: 6 };
}

function jitter(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function simulatedObservation(place: Place, checkIndex: number, now: Date, serial: number): Observation {
  const daysAgo = (checkIndex / place.checks) * place.weeksSpread * 7 + 0.5;
  const capturedAt = new Date(now.getTime() - daysAgo * MILLISECONDS_PER_DAY).toISOString();
  const east = place.eastMeters + jitter(serial) * 8;
  const north = place.northMeters + jitter(serial + 100) * 8;
  return {
    id: `simulated-${serial}`,
    capturedAt,
    latitude: FARM_LATITUDE + north / METERS_PER_DEGREE,
    longitude: FARM_LONGITUDE + east / (METERS_PER_DEGREE * Math.cos((FARM_LATITUDE * Math.PI) / 180)),
    accuracyMeters: 6,
    check: { readings: [], verdict: verdictFor(place.condition), modelVersion: 'simulated', checkedAt: capturedAt },
    reviewStatus: 'unreviewed',
  };
}

export function simulatedObservations(now: Date = new Date()): Observation[] {
  let serial = 0;
  return PLACES.flatMap((place) =>
    Array.from({ length: place.checks }, (_, checkIndex) => {
      serial += 1;
      return simulatedObservation(place, checkIndex, now, serial);
    }),
  );
}
