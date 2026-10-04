import assert from "node:assert/strict";
import test from "node:test";

import { COUNTRY_LANGUAGES, LANGUAGES, isLanguageCode, languageForDeviceCode, suggestLanguages } from "./languages.ts";

test("the catalog has 100 distinct languages", () => {
  assert.equal(new Set(LANGUAGES.map((language) => language.code)).size, 100);
});

test("every country lists only catalog languages", () => {
  for (const [country, codes] of Object.entries(COUNTRY_LANGUAGES)) {
    for (const code of codes) assert.ok(isLanguageCode(code), `${country}: ${code}`);
  }
});

test("location comes first, then the phone's languages, then its region", () => {
  const suggestions = suggestLanguages({
    locationCountry: "ET",
    deviceLanguages: [{ languageCode: "fr", regionCode: "FR" }],
    deviceRegion: "KE",
  });
  assert.deepEqual(suggestions, ["am", "om", "ti", "so", "fr"]);
});

test("languages the app cannot show are skipped before the list is cut", () => {
  const offered = new Set(["en", "sw", "so", "om"] as const);
  assert.deepEqual(suggestLanguages({ locationCountry: "KE" }, offered), ["sw", "en", "so", "om"]);
});

test("device codes map to catalog codes", () => {
  assert.equal(languageForDeviceCode("tl"), "fil");
  assert.equal(languageForDeviceCode("zh", "HK"), "yue");
  assert.equal(languageForDeviceCode("xx"), null);
});
