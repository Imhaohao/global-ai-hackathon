import assert from "node:assert/strict";
import { test } from "node:test";
import type { Observation, PlantVerdict } from "./contract.ts";
import {
  filterSightings,
  groupIntoHotspots,
  layoutHotspots,
  markerRadius,
  sightingsFromObservations,
  sinceFor,
  weeklyTrend,
} from "./hotspots.ts";
import type { Sighting } from "./hotspots.ts";
import type { DiseaseKey } from "./types.ts";

const FARM_LATITUDE = -0.4167;
const FARM_LONGITUDE = 36.95;
const METERS_PER_DEGREE = 111_320;
const NOW = new Date("2026-10-04T12:00:00.000Z");

function minutesBefore(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function daysBefore(days: number): string {
  return minutesBefore(days * 24 * 60);
}

function metersNorth(meters: number): number {
  return FARM_LATITUDE + meters / METERS_PER_DEGREE;
}

function observation(id: string, capturedAt: string, verdict: PlantVerdict, northMeters?: number): Observation {
  return {
    id,
    capturedAt,
    ...(northMeters === undefined ? {} : { latitude: metersNorth(northMeters), longitude: FARM_LONGITUDE }),
    check: { readings: [], verdict, modelVersion: "test", checkedAt: capturedAt },
    reviewStatus: "unreviewed",
  };
}

function answer(condition: DiseaseKey): PlantVerdict {
  return { kind: "answer", condition, agreeing: 4, usable: 5, total: 6 };
}

function sighting(id: string, condition: DiseaseKey, northMeters: number, capturedAt = daysBefore(1)): Sighting {
  return { observationId: id, capturedAt, condition, latitude: metersNorth(northMeters), longitude: FARM_LONGITUDE, photoUris: [] };
}

test("only checks with an answer and a location become sightings, and the rest are counted", () => {
  const summary = sightingsFromObservations([
    observation("located", daysBefore(1), answer("rust"), 0),
    observation("no-gps", daysBefore(2), answer("rust")),
    observation("retake", daysBefore(3), { kind: "retake", usable: 1, total: 6 }, 0),
    observation("disagree", daysBefore(4), { kind: "needsPerson", reason: "leavesDisagree", usable: 5, total: 6 }, 0),
  ]);
  assert.deepEqual(summary.sightings.map((entry) => entry.observationId), ["located"]);
  assert.equal(summary.withoutLocation, 1);
  assert.equal(summary.withoutAnswer, 2);
});

test("a recheck of the same spot within half an hour keeps only the latest check", () => {
  const summary = sightingsFromObservations([
    observation("first", minutesBefore(20), answer("rust"), 0),
    observation("second", minutesBefore(5), answer("rust"), 5),
  ]);
  assert.deepEqual(summary.sightings.map((entry) => entry.observationId), ["second"]);
  assert.equal(summary.repeatChecksMerged, 1);
});

test("the same spot hours later, or a different disease, or another tree far away, is not a repeat", () => {
  const summary = sightingsFromObservations([
    observation("morning", minutesBefore(300), answer("rust"), 0),
    observation("evening", minutesBefore(5), answer("rust"), 2),
    observation("other-disease", minutesBefore(5), answer("phoma"), 2),
    observation("far-tree", minutesBefore(5), answer("rust"), 80),
  ]);
  assert.equal(summary.sightings.length, 4);
  assert.equal(summary.repeatChecksMerged, 0);
});

test("sightings are listed newest first", () => {
  const summary = sightingsFromObservations([
    observation("old", daysBefore(9), answer("rust"), 0),
    observation("new", daysBefore(1), answer("rust"), 200),
  ]);
  assert.deepEqual(summary.sightings.map((entry) => entry.observationId), ["new", "old"]);
});

test("nearby sightings of one disease form one hotspot, and distance or disease splits them", () => {
  const hotspots = groupIntoHotspots([
    sighting("a", "rust", 1),
    sighting("b", "rust", 4),
    sighting("c", "rust", 8),
    sighting("d", "rust", 200),
    sighting("e", "phoma", 2),
  ]);
  const rust = hotspots.filter((hotspot) => hotspot.condition === "rust").map((hotspot) => hotspot.sightings.length);
  assert.deepEqual(rust.sort(), [1, 3]);
  assert.equal(hotspots.filter((hotspot) => hotspot.condition === "phoma").length, 1);
});

test("a hotspot sits at the average position of its sightings and lists its sightings newest first", () => {
  const [hotspot] = groupIntoHotspots([
    sighting("older", "rust", 2, daysBefore(5)),
    sighting("newer", "rust", 6, daysBefore(1)),
  ]);
  assert.ok(Math.abs(hotspot.latitude - metersNorth(4)) < 1e-9);
  assert.deepEqual(hotspot.sightings.map((entry) => entry.observationId), ["newer", "older"]);
});

test("more sightings give a bigger circle, up to a limit", () => {
  assert.ok(markerRadius(1) < markerRadius(2));
  assert.ok(markerRadius(2) < markerRadius(6));
  assert.equal(markerRadius(0), markerRadius(1));
  assert.equal(markerRadius(10_000), markerRadius(100_000));
});

test("the layout keeps every hotspot inside the box with north at the top", () => {
  const hotspots = groupIntoHotspots([sighting("south", "rust", 0), sighting("north", "phoma", 300)]);
  const layout = layoutHotspots(hotspots, 300, 200, 20);
  for (const { x, y } of layout.placed) {
    assert.ok(x >= 20 && x <= 280 && y >= 20 && y <= 180);
  }
  const north = layout.placed.find((placed) => placed.hotspot.condition === "phoma");
  const south = layout.placed.find((placed) => placed.hotspot.condition === "rust");
  assert.ok(north !== undefined && south !== undefined && north.y < south.y);
  assert.ok(layout.metersPerPixel > 0);
});

test("a single hotspot is drawn in the middle of the box", () => {
  const layout = layoutHotspots(groupIntoHotspots([sighting("only", "rust", 0)]), 300, 200, 20);
  assert.equal(layout.placed[0].x, 150);
  assert.equal(layout.placed[0].y, 100);
});

test("an empty map has no placed hotspots", () => {
  assert.deepEqual(layoutHotspots([], 300, 200, 20).placed, []);
});

test("filters keep only the chosen diseases inside the date range", () => {
  const sightings = [
    sighting("recent-rust", "rust", 0, daysBefore(2)),
    sighting("old-rust", "rust", 0, daysBefore(40)),
    sighting("recent-phoma", "phoma", 0, daysBefore(2)),
  ];
  const filter = { conditions: new Set<DiseaseKey>(["rust"]), since: sinceFor("month", NOW) };
  assert.deepEqual(filterSightings(sightings, filter).map((entry) => entry.observationId), ["recent-rust"]);
  assert.equal(sinceFor("all", NOW), null);
});

test("the weekly trend counts sightings per disease, oldest week first", () => {
  const trend = weeklyTrend(
    [
      sighting("a", "rust", 0, daysBefore(1)),
      sighting("b", "rust", 0, daysBefore(2)),
      sighting("c", "phoma", 0, daysBefore(9)),
      sighting("too-old", "rust", 0, daysBefore(60)),
    ],
    NOW,
    4,
  );
  assert.equal(trend.length, 4);
  assert.equal(trend[3].counts.rust, 2);
  assert.equal(trend[2].counts.phoma, 1);
  assert.equal(trend.reduce((sum, week) => sum + week.total, 0), 3);
  assert.ok(trend[0].weekStart < trend[3].weekStart);
});
