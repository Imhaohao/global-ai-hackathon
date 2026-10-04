import type { WetDays } from "./contract.ts";

export const MAX_RAIN_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const SOURCES: WetDays["source"][] = ["CHIRPS", "NASA POWER"];

export function rainDayTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function isFreshWetDays(value: unknown, now: Date = new Date()): value is WetDays {
  if (typeof value !== "object" || value === null) return false;
  const { wetDaysLast7, source, asOf } = value as Partial<WetDays>;
  if (typeof wetDaysLast7 !== "number" || !Number.isInteger(wetDaysLast7) || wetDaysLast7 < 0 || wetDaysLast7 > 7) return false;
  if (!SOURCES.includes(source as WetDays["source"]) || typeof asOf !== "string") return false;
  const timestamp = rainDayTimestamp(asOf);
  if (timestamp === null) return false;
  const age = now.getTime() - timestamp;
  return age >= 0 && age < MAX_RAIN_AGE_MS;
}
