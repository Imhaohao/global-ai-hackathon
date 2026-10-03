import assert from "node:assert/strict";
import { test } from "node:test";

import { buildActionCard } from "./actionCard.ts";
import { formatCaseSummarySms } from "./caseSummary.ts";
import type { CaseSummaryInput, Observation, PlantVerdict, WetDays } from "./contract.ts";
import { SMS_MAX_CHARS } from "./smsReply.ts";

const rustVerdict: PlantVerdict = { kind: "answer", condition: "rust", agreeing: 4, usable: 5, total: 6 };
const wetDays: WetDays = { wetDaysLast7: 4, source: "NASA POWER", asOf: "2026-10-03" };

function inputFor(overrides: Partial<Observation>, verdict: PlantVerdict, rain?: WetDays): CaseSummaryInput {
  const observation: Observation = {
    id: "obs-0001",
    capturedAt: "2026-10-03T08:15:00.000Z",
    check: { readings: [], verdict, modelVersion: "efficientnet-b0-v1 3f9a1c0b2d4e", checkedAt: "2026-10-03T08:15:05.000Z" },
    reviewStatus: "unreviewed",
    ...overrides,
  };
  const card = buildActionCard({ kind: "plant", verdict }, { language: "en", wetDays: rain });
  return { observation, card, wetDays: rain };
}

test("a full summary names the id, date, section, GPS, verdict, decision, rain and model", () => {
  const sms = formatCaseSummarySms(
    inputFor({ farmSection: "upper slope", latitude: -1.14612, longitude: 36.96105, accuracyMeters: 12.4 }, rustVerdict, wetDays),
  );
  assert.equal(
    sms,
    "Leaf Doctor case obs-0001, 2026-10-03. Section: upper slope. GPS -1.14612,36.96105 (within 12 m). " +
      "Result: Coffee leaf rust, 4 of 5 clear leaves agree. Decision: spray (copper, label rate). " +
      "Rain: 4 wet days of last 7 (NASA POWER). Model efficientnet-b0-v1 3f9a1c0b2d4e.",
  );
});

test("optional parts are left out when absent", () => {
  const sms = formatCaseSummarySms(inputFor({}, rustVerdict));
  assert.ok(!/Section|GPS|Rain/.test(sms));
  assert.match(sms, /Decision: prune and clean/);
});

test("GPS without an accuracy reading still prints the point", () => {
  const sms = formatCaseSummarySms(inputFor({ latitude: -0.548, longitude: 36.943 }, rustVerdict));
  assert.match(sms, /GPS -0\.54800,36\.94300\./);
});

test("verdicts that are not answers say why", () => {
  const disagree = formatCaseSummarySms(inputFor({}, { kind: "needsPerson", reason: "leavesDisagree", usable: 5, total: 6 }));
  assert.match(disagree, /not sure, leaves disagree, 5 of 6 leaves clear enough/);
  const tooFew = formatCaseSummarySms(inputFor({}, { kind: "needsPerson", reason: "tooFewClearLeaves", usable: 2, total: 6 }));
  assert.match(tooFew, /too few clear leaves, 2 of 6/);
  assert.match(formatCaseSummarySms(inputFor({}, { kind: "retake", usable: 1, total: 3 })), /no answer yet, 1 of 3/);
});

test("the longest realistic input stays under the SMS limit and keeps the model version", () => {
  const sms = formatCaseSummarySms(
    inputFor(
      {
        id: "3f2b8c1e-9d4a-4e7b-8a21-5c6d7e8f9a0b",
        farmSection: "the lower terrace next to the road by the river and the school",
        latitude: -10.123456789,
        longitude: -100.123456789,
        accuracyMeters: 1234.5,
      },
      { kind: "needsPerson", reason: "tooFewClearLeaves", usable: 3, total: 6 },
      { wetDaysLast7: 7, source: "NASA POWER", asOf: "2026-10-03" },
    ),
  );
  assert.ok(sms.length <= SMS_MAX_CHARS, `length ${sms.length}`);
  assert.match(sms, /Model efficientnet-b0-v1 3f9a1c0b2d4e\.$/);
});

test("the summary is plain ASCII even when the section name has accents", () => {
  const sms = formatCaseSummarySms(inputFor({ farmSection: "Shamba la Kamau é" }, rustVerdict));
  assert.match(sms, /^[\x20-\x7e\n]*$/);
});
