import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALERT_FOOTER,
  alertCommandReply,
  alertSmsBody,
  conditionReportedInText,
  draftAlertMessage,
  farmsReportingRecently,
  findAlertArea,
  nextSuggestionStep,
  OUTBREAK_WINDOW_MS,
  parseAlertCommand,
} from "./neighbourAlerts.ts";
import { COMPLIANCE_OVERHEAD_CHARS } from "./smsCompliance.ts";
import { SMS_MAX_CHARS } from "./smsReply.ts";

const NOW = Date.UTC(2026, 9, 3, 12);
const DAY = 24 * 60 * 60 * 1000;
const karima = findAlertArea("Karima");

test("ALERTS with an area joins that area, ignoring case and punctuation", () => {
  assert.deepEqual(parseAlertCommand("alerts iria ini"), { kind: "join", area: findAlertArea("Iria-ini") });
  assert.deepEqual(parseAlertCommand("ALERTS: Karima!"), { kind: "join", area: karima });
});

test("ALERTS alone lists areas, ALERTS OFF leaves, an unknown place asks again", () => {
  assert.deepEqual(parseAlertCommand("ALERTS"), { kind: "list" });
  assert.deepEqual(parseAlertCommand("Alerts off"), { kind: "leave" });
  assert.deepEqual(parseAlertCommand("ALERTS Nairobi"), { kind: "unknownArea" });
  assert.match(alertCommandReply({ kind: "unknownArea" }), /Chinga, Iria-ini, Karima or Mahiga/);
});

test("ordinary questions are not alert commands", () => {
  assert.equal(parseAlertCommand("orange powder under my leaves"), null);
  assert.equal(parseAlertCommand("are alerts free?"), null);
});

test("a clear text description of rust counts as a rust report", () => {
  assert.equal(conditionReportedInText("yellow spots on top and orange powder underneath the leaves"), "rust");
});

test("vague or healthy descriptions do not count as reports", () => {
  assert.equal(conditionReportedInText("my coffee is not doing well"), null);
  assert.equal(conditionReportedInText("what does the seed code mean"), null);
});

test("only distinct farms inside the seven-day window are counted", () => {
  const reports = [
    { farmerId: "a", reportedAt: NOW - DAY },
    { farmerId: "a", reportedAt: NOW - 2 * DAY },
    { farmerId: "b", reportedAt: NOW - 3 * DAY },
    { farmerId: "c", reportedAt: NOW - OUTBREAK_WINDOW_MS - 1 },
  ];
  assert.equal(farmsReportingRecently(reports, NOW), 2);
});

test("a suggestion is created at three farms and updated while it waits", () => {
  assert.equal(nextSuggestionStep(2, null, NOW), "none");
  assert.equal(nextSuggestionStep(3, null, NOW), "create");
  assert.equal(nextSuggestionStep(4, { status: "suggested" }, NOW), "update");
});

test("an alert sent or dismissed this week blocks a repeat, an older one does not", () => {
  assert.equal(nextSuggestionStep(5, { status: "sent", decidedAt: NOW - DAY }, NOW), "none");
  assert.equal(nextSuggestionStep(5, { status: "dismissed", decidedAt: NOW - DAY }, NOW), "none");
  assert.equal(nextSuggestionStep(5, { status: "sent", decidedAt: NOW - OUTBREAK_WINDOW_MS - 1 }, NOW), "create");
});

test("the draft names the area, the count and the disease, and leaves room for the footer", () => {
  assert.ok(karima);
  const draft = draftAlertMessage(karima, "rust", 3);
  assert.match(draft, /^Leaf alert for Karima: 3 farms near you reported coffee leaf rust in the last 7 days\./);
  assert.ok(draft.length + ALERT_FOOTER.length + 1 + COMPLIANCE_OVERHEAD_CHARS <= SMS_MAX_CHARS);
});

test("the sent body always ends with the opt-out footer, even after a long officer edit", () => {
  const body = alertSmsBody("Rust is spreading. ".repeat(60));
  assert.ok(body.endsWith(`\n${ALERT_FOOTER}`));
  assert.ok(body.length + COMPLIANCE_OVERHEAD_CHARS <= SMS_MAX_CHARS);
});
