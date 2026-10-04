import type { WetDays } from "./contract.ts";
import { roundCoordinate, withTimeout } from "./rainSource.ts";
import type { FetchLike } from "./rainSource.ts";
import { isFreshWetDays } from "./wetDays.ts";

export { isFreshWetDays, MAX_RAIN_AGE_MS } from "./wetDays.ts";

export const RAIN_REQUEST_TIMEOUT_MS = 8000;

export interface FetchWetDaysOptions {
  fetchLike?: FetchLike;
  timeoutMs?: number;
  now?: Date;
}

export async function fetchWetDays(
  backendUrl: string,
  latitude: number,
  longitude: number,
  options: FetchWetDaysOptions = {},
): Promise<WetDays | null> {
  const { fetchLike = fetch, timeoutMs = RAIN_REQUEST_TIMEOUT_MS } = options;
  const query = new URLSearchParams({
    lat: String(roundCoordinate(latitude)),
    lon: String(roundCoordinate(longitude)),
  });
  try {
    const payload = await withTimeout(timeoutMs, async (signal) => {
      const response = await fetchLike(`${backendUrl.replace(/\/$/, "")}/rain?${query.toString()}`, { signal });
      return response.ok ? ((await response.json()) as unknown) : null;
    });
    return isFreshWetDays(payload, options.now) ? payload : null;
  } catch {
    return null;
  }
}
