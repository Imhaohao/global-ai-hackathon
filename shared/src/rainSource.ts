import type { WetDays } from "./contract.ts";

export const WET_DAY_MIN_MM = 1;
export const WINDOW_DAYS = 7;
export const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point";
export const NASA_POWER_TIMEOUT_MS = 6000;

const LOOKBACK_DAYS = 14;
const COORDINATE_DECIMALS = 1;
const MISSING_VALUE_BELOW = -900;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Pick<Response, "ok" | "status" | "json">>;

export async function withTimeout<T>(timeoutMs: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

export function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

function compactDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function isoDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

export function nasaPowerUrl(latitude: number, longitude: number, now: Date): string {
  const start = new Date(now.getTime() - (LOOKBACK_DAYS - 1) * MS_PER_DAY);
  const query = new URLSearchParams({
    parameters: "PRECTOTCORR",
    community: "AG",
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    start: compactDate(start),
    end: compactDate(now),
    format: "JSON",
  });
  return `${NASA_POWER_URL}?${query.toString()}`;
}

function dailyRainfall(payload: unknown): Record<string, number> | null {
  if (typeof payload !== "object" || payload === null) return null;
  const properties = (payload as { properties?: { parameter?: { PRECTOTCORR?: unknown } } }).properties;
  const series = properties?.parameter?.PRECTOTCORR;
  if (typeof series !== "object" || series === null) return null;
  return series as Record<string, number>;
}

export function wetDaysFromNasaPower(payload: unknown): WetDays | null {
  const series = dailyRainfall(payload);
  if (!series) return null;
  const measuredDays = Object.entries(series)
    .filter(([, millimetres]) => typeof millimetres === "number" && millimetres > MISSING_VALUE_BELOW)
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-WINDOW_DAYS);
  if (measuredDays.length < WINDOW_DAYS) return null;
  return {
    wetDaysLast7: measuredDays.filter(([, millimetres]) => millimetres >= WET_DAY_MIN_MM).length,
    source: "NASA POWER",
    asOf: isoDate(measuredDays[measuredDays.length - 1][0]),
  };
}

export async function lookupWetDays(
  fetchLike: FetchLike,
  latitude: number,
  longitude: number,
  now: Date = new Date(),
): Promise<WetDays | null> {
  try {
    const payload = await withTimeout(NASA_POWER_TIMEOUT_MS, async (signal) => {
      const response = await fetchLike(nasaPowerUrl(latitude, longitude, now), { signal });
      return response.ok ? ((await response.json()) as unknown) : null;
    });
    return wetDaysFromNasaPower(payload);
  } catch {
    return null;
  }
}
