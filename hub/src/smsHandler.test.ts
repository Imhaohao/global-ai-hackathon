import assert from "node:assert/strict";
import { test } from "node:test";

import type { Answer } from "./answerQuestion";
import { handleCarrierSms, handleQuestionSms } from "./smsHandler";
import type { IncomingSms } from "../modules/sms-gateway";

const sms: IncomingSms = { from: "+254700000000", body: "orange powder", receivedAt: 1 };

function answer(reply = "safe reply"): Answer {
  return { reply, source: "online", modelReading: null };
}

test("carrier commands are handled before any answer callback and are formatted", async () => {
  const sent: string[] = [];
  const records: string[] = [];
  let savedOptOut = false;
  const handled = await handleCarrierSms(
    { ...sms, body: "STOP." },
    async (_sender, optedOut) => {
      savedOptOut = optedOut;
      return true;
    },
    async (_to, body) => { sent.push(body); },
    (_sms, reply) => { records.push(reply); },
    () => {},
  );
  assert.equal(handled, true);
  assert.equal(savedOptOut, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /^Leaf Doctor by David: /);
  assert.match(sent[0], /Reply START/);
  assert.equal(records[0], sent[0]);
});

test("a STOP that arrives while inference is pending blocks the late reply", async () => {
  let optedOut = false;
  let resolveAnswer!: (value: Answer) => void;
  let sent = 0;
  const pending = handleQuestionSms(
    sms,
    () => optedOut,
    () => true,
    () => new Promise<Answer>((resolve) => { resolveAnswer = resolve; }),
    () => true,
    () => {},
    async () => { sent += 1; },
    () => {},
    () => {},
  );
  optedOut = true;
  resolveAnswer(answer("model output must not be sent"));
  await pending;
  assert.equal(sent, 0);
});

test("normal hub answers carry the brand and first-reply footer", async () => {
  let sent = "";
  await handleQuestionSms(
    sms,
    () => false,
    () => true,
    async () => answer("coffee leaf answer"),
    () => true,
    () => {},
    async (_to, body) => { sent = body; },
    () => {},
    () => {},
  );
  assert.match(sent, /^Leaf Doctor by David: coffee leaf answer\nReply STOP to opt out/);
});
