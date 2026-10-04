import type { Observation } from "./contract.ts";
import { DISEASE_KEYS } from "./types.ts";
import type { DiseaseKey } from "./types.ts";

export const HOTSPOT_LINK_METERS = 25;
export const REPEAT_CHECK_MINUTES = 30;
export const REPEAT_CHECK_METERS = 15;
export const MINIMUM_MAP_SPAN_METERS = 120;

const METERS_PER_DEGREE_LATITUDE = 111_320;
const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;

export interface Sighting {
  observationId: string;
  capturedAt: string;
  condition: DiseaseKey;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  farmSection?: string;
  photoUris: string[];
}

export interface SightingSummary {
  sightings: Sighting[];
  withoutLocation: number;
  withoutAnswer: number;
  repeatChecksMerged: number;
}

export interface Hotspot {
  id: string;
  condition: DiseaseKey;
  latitude: number;
  longitude: number;
  sightings: Sighting[];
}

export interface PlacedHotspot {
  hotspot: Hotspot;
  x: number;
  y: number;
}

export interface MapLayout {
  placed: PlacedHotspot[];
  metersPerPixel: number;
  center: { latitude: number; longitude: number } | null;
}

export type DateRange = "week" | "month" | "season" | "all";

export interface SightingFilter {
  conditions: ReadonlySet<DiseaseKey>;
  since: Date | null;
}

export interface TrendWeek {
  weekStart: string;
  counts: Record<DiseaseKey, number>;
  total: number;
}

interface MeterPoint {
  x: number;
  y: number;
}

interface MeterFrame {
  originLatitude: number;
  originLongitude: number;
  metersPerDegreeLongitude: number;
}

function meterFrame(points: { latitude: number; longitude: number }[]): MeterFrame {
  const count = Math.max(points.length, 1);
  const originLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / count;
  const originLongitude = points.reduce((sum, point) => sum + point.longitude, 0) / count;
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * Math.cos((originLatitude * Math.PI) / 180);
  return { originLatitude, originLongitude, metersPerDegreeLongitude };
}

function toMeters(point: { latitude: number; longitude: number }, frame: MeterFrame): MeterPoint {
  return {
    x: (point.longitude - frame.originLongitude) * frame.metersPerDegreeLongitude,
    y: (point.latitude - frame.originLatitude) * METERS_PER_DEGREE_LATITUDE,
  };
}

function hasCoordinates(observation: Observation): observation is Observation & { latitude: number; longitude: number } {
  return Number.isFinite(observation.latitude) && Number.isFinite(observation.longitude);
}

function toSighting(observation: Observation & { latitude: number; longitude: number }, condition: DiseaseKey): Sighting {
  return {
    observationId: observation.id,
    capturedAt: observation.capturedAt,
    condition,
    latitude: observation.latitude,
    longitude: observation.longitude,
    accuracyMeters: observation.accuracyMeters,
    farmSection: observation.farmSection,
    photoUris: observation.check.readings.map((reading) => reading.photoUri),
  };
}

function isRepeatOf(earlier: Sighting, later: Sighting, frame: MeterFrame): boolean {
  if (earlier.condition !== later.condition) return false;
  const minutesApart = (Date.parse(later.capturedAt) - Date.parse(earlier.capturedAt)) / MILLISECONDS_PER_MINUTE;
  if (minutesApart > REPEAT_CHECK_MINUTES) return false;
  const from = toMeters(earlier, frame);
  const to = toMeters(later, frame);
  return Math.hypot(from.x - to.x, from.y - to.y) <= REPEAT_CHECK_METERS;
}

function mergeRepeatChecks(sightings: Sighting[]): { kept: Sighting[]; merged: number } {
  const frame = meterFrame(sightings);
  const oldestFirst = [...sightings].sort((first, second) => first.capturedAt.localeCompare(second.capturedAt));
  const kept: Sighting[] = [];
  let merged = 0;
  for (const sighting of oldestFirst) {
    const repeatIndex = kept.findIndex((earlier) => isRepeatOf(earlier, sighting, frame));
    if (repeatIndex === -1) {
      kept.push(sighting);
      continue;
    }
    kept[repeatIndex] = sighting;
    merged += 1;
  }
  return { kept, merged };
}

export function sightingsFromObservations(observations: Observation[]): SightingSummary {
  const located: Sighting[] = [];
  let withoutLocation = 0;
  let withoutAnswer = 0;
  for (const observation of observations) {
    const verdict = observation.check.verdict;
    if (verdict.kind !== "answer") {
      withoutAnswer += 1;
    } else if (!hasCoordinates(observation)) {
      withoutLocation += 1;
    } else {
      located.push(toSighting(observation, verdict.condition));
    }
  }
  const { kept, merged } = mergeRepeatChecks(located);
  const newestFirst = kept.sort((first, second) => second.capturedAt.localeCompare(first.capturedAt));
  return { sightings: newestFirst, withoutLocation, withoutAnswer, repeatChecksMerged: merged };
}

function averageOf(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function findRoot(parents: number[], index: number): number {
  let root = index;
  while (parents[root] !== root) root = parents[root];
  return root;
}

function linkedGroups(sightings: Sighting[], linkMeters: number): Sighting[][] {
  const frame = meterFrame(sightings);
  const points = sightings.map((sighting) => toMeters(sighting, frame));
  const parents = sightings.map((_, index) => index);
  for (let first = 0; first < sightings.length; first += 1) {
    for (let second = first + 1; second < sightings.length; second += 1) {
      const isNear = Math.hypot(points[first].x - points[second].x, points[first].y - points[second].y) <= linkMeters;
      if (isNear && sightings[first].condition === sightings[second].condition) {
        parents[findRoot(parents, second)] = findRoot(parents, first);
      }
    }
  }
  const groups = new Map<number, Sighting[]>();
  sightings.forEach((sighting, index) => {
    const root = findRoot(parents, index);
    groups.set(root, [...(groups.get(root) ?? []), sighting]);
  });
  return [...groups.values()];
}

function toHotspot(members: Sighting[]): Hotspot {
  const newestFirst = [...members].sort((first, second) => second.capturedAt.localeCompare(first.capturedAt));
  const oldest = newestFirst[newestFirst.length - 1];
  return {
    id: `${oldest.condition}:${oldest.observationId}`,
    condition: oldest.condition,
    latitude: averageOf(members.map((member) => member.latitude)),
    longitude: averageOf(members.map((member) => member.longitude)),
    sightings: newestFirst,
  };
}

export function groupIntoHotspots(sightings: Sighting[], linkMeters: number = HOTSPOT_LINK_METERS): Hotspot[] {
  return linkedGroups(sightings, linkMeters).map(toHotspot);
}

const MARKER_MINIMUM_RADIUS = 10;
const MARKER_RADIUS_STEP = 8;
const MARKER_MAXIMUM_RADIUS = 44;

export function markerRadius(sightingCount: number): number {
  const extraSightings = Math.max(sightingCount, 1) - 1;
  const radius = MARKER_MINIMUM_RADIUS + MARKER_RADIUS_STEP * (Math.sqrt(extraSightings + 1) - 1);
  return Math.min(radius, MARKER_MAXIMUM_RADIUS);
}

export function layoutHotspots(hotspots: Hotspot[], width: number, height: number, padding: number): MapLayout {
  if (hotspots.length === 0) return { placed: [], metersPerPixel: 1, center: null };
  const frame = meterFrame(hotspots);
  const points = hotspots.map((hotspot) => toMeters(hotspot, frame));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), MINIMUM_MAP_SPAN_METERS);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), MINIMUM_MAP_SPAN_METERS);
  const pixelsPerMeter = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const placed = hotspots.map((hotspot, index) => ({
    hotspot,
    x: width / 2 + (points[index].x - centerX) * pixelsPerMeter,
    y: height / 2 - (points[index].y - centerY) * pixelsPerMeter,
  }));
  const center = {
    latitude: frame.originLatitude + centerY / METERS_PER_DEGREE_LATITUDE,
    longitude: frame.originLongitude + centerX / frame.metersPerDegreeLongitude,
  };
  return { placed, metersPerPixel: 1 / pixelsPerMeter, center };
}

const DAYS_BY_RANGE: Record<DateRange, number | null> = { week: 7, month: 30, season: 90, all: null };

export function sinceFor(range: DateRange, now: Date): Date | null {
  const days = DAYS_BY_RANGE[range];
  return days === null ? null : new Date(now.getTime() - days * MILLISECONDS_PER_DAY);
}

export function filterSightings(sightings: Sighting[], filter: SightingFilter): Sighting[] {
  return sightings.filter(
    (sighting) =>
      filter.conditions.has(sighting.condition) &&
      (filter.since === null || Date.parse(sighting.capturedAt) >= filter.since.getTime()),
  );
}

function emptyCounts(): Record<DiseaseKey, number> {
  return Object.fromEntries(DISEASE_KEYS.map((key) => [key, 0])) as Record<DiseaseKey, number>;
}

export function weeklyTrend(sightings: Sighting[], now: Date, weeks: number): TrendWeek[] {
  const weekMilliseconds = DAYS_PER_WEEK * MILLISECONDS_PER_DAY;
  const buckets = Array.from({ length: weeks }, (_, index) => {
    const weekStart = new Date(now.getTime() - (weeks - index) * weekMilliseconds);
    return { weekStart: weekStart.toISOString(), counts: emptyCounts(), total: 0 };
  });
  const firstStart = now.getTime() - weeks * weekMilliseconds;
  for (const sighting of sightings) {
    const age = Date.parse(sighting.capturedAt) - firstStart;
    const index = Math.floor(age / weekMilliseconds);
    if (age < 0 || index >= weeks) continue;
    buckets[index].counts[sighting.condition] += 1;
    buckets[index].total += 1;
  }
  return buckets;
}
