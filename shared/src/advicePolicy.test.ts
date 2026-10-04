import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRuleBasedReply } from "./advicePolicy.ts";
import type { ReplyMatch } from "./smsReply.ts";

function confident(key: "rust" | "weevil"): ReplyMatch {
  return { kind: "confident", best: { key, score: 2, matchedWords: [] } };
}

test("a confident rust reply uses the no-rain action card and omits spraying", () => {
  const reply = buildRuleBasedReply(confident("rust"), "en");
  assert.match(reply, /Decision: prune and clean up/);
  assert.doesNotMatch(reply, /copper|spray/i);
});

test("a confident officer-only condition keeps its escalation step", () => {
  const reply = buildRuleBasedReply(confident("weevil"), "en");
  assert.match(reply, /field officer/i);
  assert.match(reply, /Decision: show your field officer/);
});
