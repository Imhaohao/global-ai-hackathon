import type { WetDays } from '../../../shared/src/contract.ts';
import { fetchWetDays, isFreshWetDays, MAX_RAIN_AGE_MS } from '../../../shared/src/rain.ts';
import { readLastKnownLocation } from './deviceLocation';
import { deleteFile, readJson, writeJson } from './documentStore';

const RAIN_FILE = 'rain.json';
const STEPS_PER_DEGREE = 10;

function roundToTenthOfDegree(degrees: number): number {
  return Math.round(degrees * STEPS_PER_DEGREE) / STEPS_PER_DEGREE;
}

type CachedWetDays = { wetDays: WetDays; fetchedAt: string };

export function freshWetDays(cached: CachedWetDays | null, now: Date): WetDays | undefined {
  if (!cached) return undefined;
  if (typeof cached.fetchedAt !== 'string') return undefined;
  const fetchedAt = Date.parse(cached.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return undefined;
  const age = now.getTime() - fetchedAt;
  if (age < 0 || age >= MAX_RAIN_AGE_MS) return undefined;
  return isFreshWetDays(cached.wetDays, now) ? cached.wetDays : undefined;
}

export function loadFreshWetDays(): WetDays | undefined {
  return freshWetDays(readJson<CachedWetDays | null>(null, RAIN_FILE), new Date());
}

export function clearCachedWetDays(): boolean {
  return deleteFile(RAIN_FILE);
}

export async function refreshWetDays(shouldSave: () => boolean = () => true): Promise<WetDays | undefined> {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!backendUrl) return shouldSave() ? loadFreshWetDays() : undefined;
    const location = await readLastKnownLocation();
    if (!shouldSave()) return undefined;
    if (!location) return loadFreshWetDays();
    const wetDays = await fetchWetDays(
      backendUrl,
      roundToTenthOfDegree(location.latitude),
      roundToTenthOfDegree(location.longitude),
    );
    if (!wetDays) return loadFreshWetDays();
    if (!shouldSave()) return undefined;
    writeJson({ wetDays, fetchedAt: new Date().toISOString() } satisfies CachedWetDays, RAIN_FILE);
    return wetDays;
  } catch {
    return loadFreshWetDays();
  }
}
