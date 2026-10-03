import assert from "node:assert/strict";
import { test } from "node:test";
import type { LeafConfidence, LeafReading } from "./contract.ts";
import { isUsableReading, voteOnPlant } from "./plantVote.ts";
import type { DiseaseKey } from "./types.ts";

function leaf(condition: DiseaseKey, confidence: LeafConfidence = "confident", qualityPassed = true): LeafReading {
  return { photoUri: `file:///leaf-${condition}.jpg`, condition, probability: 0.9, confidence, qualityPassed };
}

function leaves(condition: DiseaseKey, count: number, confidence: LeafConfidence = "confident"): LeafReading[] {
  return Array.from({ length: count }, () => leaf(condition, confidence));
}

test("a reading needs a passed quality check and a confidence above unclear to count", () => {
  assert.equal(isUsableReading(leaf("rust", "confident")), true);
  assert.equal(isUsableReading(leaf("rust", "possible")), true);
  assert.equal(isUsableReading(leaf("rust", "unclear")), false);
  assert.equal(isUsableReading(leaf("rust", "confident", false)), false);
});

test("no photos asks for a retake", () => {
  assert.deepEqual(voteOnPlant([]), { kind: "retake", usable: 0, total: 0 });
});

test("fewer than three clear leaves out of five photos asks for a retake", () => {
  const readings = [...leaves("rust", 2), ...leaves("rust", 3, "unclear")];
  assert.deepEqual(voteOnPlant(readings), { kind: "retake", usable: 2, total: 5 });
});

test("blurry or dark leaves do not count even when the model was confident", () => {
  const readings = [leaf("rust"), leaf("rust", "confident", false), leaf("rust", "confident", false)];
  assert.deepEqual(voteOnPlant(readings), { kind: "retake", usable: 1, total: 3 });
});

test("fewer than three clear leaves after six photos sends the farmer to a person", () => {
  const readings = [...leaves("rust", 2), ...leaves("cercospora", 4, "unclear")];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "needsPerson",
    reason: "tooFewClearLeaves",
    usable: 2,
    total: 6,
  });
});

test("three clear leaves that agree give an answer", () => {
  assert.deepEqual(voteOnPlant(leaves("rust", 3)), {
    kind: "answer",
    condition: "rust",
    agreeing: 3,
    usable: 3,
    total: 3,
  });
});

test("possible readings vote like confident ones", () => {
  const readings = [...leaves("phoma", 2, "possible"), leaf("phoma")];
  assert.equal(voteOnPlant(readings).kind, "answer");
});

test("three of five clear leaves is exactly sixty percent and gives an answer", () => {
  const readings = [...leaves("cercospora", 3), ...leaves("healthy", 2)];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "answer",
    condition: "cercospora",
    agreeing: 3,
    usable: 5,
    total: 5,
  });
});

test("unclear leaves do not vote against the clear majority", () => {
  const readings = [...leaves("miner", 3), ...leaves("rust", 3, "unclear")];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "answer",
    condition: "miner",
    agreeing: 3,
    usable: 3,
    total: 6,
  });
});

test("three of six clear leaves is below sixty percent and goes to a person", () => {
  const readings = [...leaves("rust", 3), ...leaves("cercospora", 2), leaf("phoma")];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "needsPerson",
    reason: "leavesDisagree",
    usable: 6,
    total: 6,
  });
});

test("a tie between two conditions goes to a person", () => {
  const readings = [...leaves("rust", 3), ...leaves("cercospora", 3)];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "needsPerson",
    reason: "leavesDisagree",
    usable: 6,
    total: 6,
  });
});

test("a leader with only two votes goes to a person even when it has the most", () => {
  const readings = [...leaves("rust", 2), leaf("cercospora"), leaf("phoma")];
  assert.deepEqual(voteOnPlant(readings), {
    kind: "needsPerson",
    reason: "leavesDisagree",
    usable: 4,
    total: 4,
  });
});
