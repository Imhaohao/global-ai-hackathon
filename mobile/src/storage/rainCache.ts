import type { WetDays } from '../../../shared/src/contract.ts';
import { fetchWetDays } from '../../../shared/src/rain.ts';
import { readLastKnownLocation } from './deviceLocation';
import { readJson, writeJson } from './documentStore';

const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const RAIN_FILE = 'rain.json';
const STEPS_PER_DEGREE = 10;

function roundToTenthOfDegree(degrees: number): number {
  return Math.round(degrees * STEPS_PER_DEGREE) / STEPS_PER_DEGREE;
}

type CachedWetDays = { wetDays: WetDays; fetchedAt: string };

export function freshWetDays(cached: CachedWetDays | null, now: Date): WetDays | undefined {
  if (!cached) return undefined;
  const age = now.getTime() - new Date(cached.fetchedAt).getTime();
  return age >= 0 && age < MAX_AGE_MS ? cached.wetDays : undefined;
}

export function loadFreshWetDays(): WetDays | undefined {
  return freshWetDays(readJson<CachedWetDays | null>(null, RAIN_FILE), new Date());
}

export async function refreshWetDays(): Promise<WetDays | undefined> {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!backendUrl) return loadFreshWetDays();
  const location = await readLastKnownLocation();
  if (!location) return loadFreshWetDays();
  const wetDays = await fetchWetDays(
    backendUrl,
    roundToTenthOfDegree(location.latitude),
    roundToTenthOfDegree(location.longitude),
  );
  if (!wetDays) return loadFreshWetDays();
  writeJson({ wetDays, fetchedAt: new Date().toISOString() } satisfies CachedWetDays, RAIN_FILE);
  return wetDays;
}
