import type { WetDays } from "./contract.ts";
import { roundCoordinate, withTimeout } from "./rainSource.ts";
import type { FetchLike } from "./rainSource.ts";

export const RAIN_REQUEST_TIMEOUT_MS = 8000;

const SOURCES: WetDays["source"][] = ["CHIRPS", "NASA POWER"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_IN_WINDOW = 7;

export interface FetchWetDaysOptions {
  fetchLike?: FetchLike;
  timeoutMs?: number;
}

function isWetDays(value: unknown): value is WetDays {
  if (typeof value !== "object" || value === null) return false;
  const { wetDaysLast7, source, asOf } = value as Partial<WetDays>;
  const countIsValid = Number.isInteger(wetDaysLast7) && (wetDaysLast7 as number) >= 0 && (wetDaysLast7 as number) <= DAYS_IN_WINDOW;
  const sourceIsKnown = SOURCES.includes(source as WetDays["source"]);
  return countIsValid && sourceIsKnown && typeof asOf === "string" && ISO_DATE.test(asOf);
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
    return isWetDays(payload) ? payload : null;
  } catch {
    return null;
  }
}
