import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchWetDays } from "./rain.ts";
import type { FetchLike } from "./rainSource.ts";
import { lookupWetDays, nasaPowerUrl, wetDaysFromNasaPower } from "./rainSource.ts";

const NOW = new Date("2026-10-03T12:00:00.000Z");

function powerPayload(series: Record<string, number>) {
  return { properties: { parameter: { PRECTOTCORR: series } } };
}

const SEVEN_DAYS_WITH_FOUR_WET = {
  "20260924": 5,
  "20260925": 0.4,
  "20260926": 0.24,
  "20260927": 1.09,
  "20260928": 2.71,
  "20260929": 0.81,
  "20260930": 1,
  "20261001": -999,
  "20261002": -999,
  "20261003": -999,
};

function fakeFetch(body: unknown, ok = true): { fetchLike: FetchLike; urls: string[] } {
  const urls: string[] = [];
  const fetchLike: FetchLike = async (url) => {
    urls.push(url);
    return { ok, status: ok ? 200 : 500, json: async () => body } as Awaited<ReturnType<FetchLike>>;
  };
  return { fetchLike, urls };
}

const neverAnswers: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));

test("a wet day is at least 1 mm; the latest seven measured days are counted and fill values skipped", () => {
  const result = wetDaysFromNasaPower(powerPayload(SEVEN_DAYS_WITH_FOUR_WET));
  assert.deepEqual(result, { wetDaysLast7: 4, source: "NASA POWER", asOf: "2026-09-30" });
});

test("fewer than seven measured days gives no answer", () => {
  assert.equal(wetDaysFromNasaPower(powerPayload({ "20260930": 3, "20260929": 3 })), null);
  assert.equal(wetDaysFromNasaPower({}), null);
  assert.equal(wetDaysFromNasaPower(null), null);
});

test("the NASA POWER request asks for two weeks of corrected precipitation at a rounded point", () => {
  const url = new URL(nasaPowerUrl(-1.14612, 36.96105, NOW));
  assert.equal(url.origin + url.pathname, "https://power.larc.nasa.gov/api/temporal/daily/point");
  assert.equal(url.searchParams.get("parameters"), "PRECTOTCORR");
  assert.equal(url.searchParams.get("start"), "20260920");
  assert.equal(url.searchParams.get("end"), "20261003");
  assert.equal(url.searchParams.get("latitude"), "-1.1");
  assert.equal(url.searchParams.get("longitude"), "37");
});

test("lookupWetDays returns the count, and null on a bad status, a network error or a timeout", async () => {
  const { fetchLike } = fakeFetch(powerPayload(SEVEN_DAYS_WITH_FOUR_WET));
  assert.equal((await lookupWetDays(fetchLike, -1.1, 36.9, NOW))?.wetDaysLast7, 4);
  assert.equal(await lookupWetDays(fakeFetch({}, false).fetchLike, -1.1, 36.9, NOW), null);
  const throwing: FetchLike = async () => {
    throw new Error("offline");
  };
  assert.equal(await lookupWetDays(throwing, -1.1, 36.9, NOW), null);
});

test("fetchWetDays calls /rain with a rounded point and returns the backend answer", async () => {
  const answer = { wetDaysLast7: 3, source: "NASA POWER", asOf: "2026-09-30" };
  const { fetchLike, urls } = fakeFetch(answer);
  const result = await fetchWetDays("https://backend.example.test/", -1.14612, 36.96105, { fetchLike });
  assert.deepEqual(result, answer);
  assert.equal(urls[0], "https://backend.example.test/rain?lat=-1.1&lon=37");
});

test("fetchWetDays returns null on a bad status, a malformed body, a network error and a timeout", async () => {
  assert.equal(await fetchWetDays("https://b.test", 0, 0, { fetchLike: fakeFetch({}, false).fetchLike }), null);
  assert.equal(await fetchWetDays("https://b.test", 0, 0, { fetchLike: fakeFetch({ wetDaysLast7: 9 }).fetchLike }), null);
  assert.equal(
    await fetchWetDays("https://b.test", 0, 0, {
      fetchLike: async () => {
        throw new Error("offline");
      },
    }),
    null,
  );
  assert.equal(await fetchWetDays("https://b.test", 0, 0, { fetchLike: neverAnswers, timeoutMs: 20 }), null);
});
