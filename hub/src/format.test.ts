import assert from "node:assert/strict";
import { test } from "node:test";

import type { FarmerReport } from "../../shared/src/localModel/index.ts";
import { describeReading, formatBytes } from "./format.ts";

const reading: FarmerReport = {
  language: "sw",
  topic: "spraying",
  symptomsInEnglish: "",
  sprayProduct: "copper",
  sprayedWhen: "yesterday",
  rainAfterSpraying: "yes",
};

test("download sizes read like the catalog sizes", () => {
  assert.equal(formatBytes(1_280_835_840), "1.3 GB");
  assert.equal(formatBytes(640_000_000), "640 MB");
});

test("the model's reading is shown as one plain sentence", () => {
  assert.equal(describeReading(reading), "Sprayed copper yesterday, then it rained");
  assert.equal(describeReading({ ...reading, symptomsInEnglish: "orange powder underneath" }), "orange powder underneath");
  assert.equal(describeReading({ ...reading, topic: "leaf_symptoms", sprayProduct: "not_mentioned" }), "About leaf symptoms");
});
