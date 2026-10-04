import assert from "node:assert/strict";
import test from "node:test";

import { buildActionCard } from "./actionCard.ts";
import { whatToBuy } from "./whatToBuy.ts";

const answer = (condition: "rust" | "cercospora" | "phoma" | "miner" | "healthy") => ({
  kind: "plant" as const,
  verdict: { kind: "answer" as const, condition, agreeing: 3, usable: 3, total: 3 },
});
const wet = { wetDaysLast7: 5, source: "CHIRPS" as const, asOf: new Date().toISOString().slice(0, 10) };

test("rust in wet weather lists copper and spray gear because the card says to spray", () => {
  const card = buildActionCard(answer("rust"), { language: "en", wetDays: wet });
  assert.equal(card.decision, "spray");
  assert.deepEqual(whatToBuy(card).items, ["copperFungicide", "sprayGear", "fertilizer", "pruningTools"]);
});

test("rust without a spray decision never lists copper", () => {
  const card = buildActionCard(answer("rust"), { language: "en" });
  assert.notEqual(card.decision, "spray");
  assert.ok(!whatToBuy(card).items.includes("copperFungicide"));
});

test("brown eye spot is fixed by feeding and pruning, not by buying spray", () => {
  assert.deepEqual(whatToBuy(buildActionCard(answer("cercospora"), { language: "en" })).items, ["fertilizer", "pruningTools"]);
});

test("pests and unsure results say to wait for the officer before buying anything", () => {
  const miner = whatToBuy(buildActionCard(answer("miner"), { language: "en" }));
  assert.deepEqual(miner, { items: [], waitForOfficer: true });
  const unsure = { kind: "plant" as const, verdict: { kind: "needsPerson" as const, reason: "leavesDisagree" as const, usable: 3, total: 3 } };
  assert.equal(whatToBuy(buildActionCard(unsure, { language: "en" })).waitForOfficer, true);
});

test("a healthy plant needs nothing bought", () => {
  assert.deepEqual(whatToBuy(buildActionCard(answer("healthy"), { language: "en" })), { items: [], waitForOfficer: false });
});
