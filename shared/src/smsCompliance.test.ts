import assert from "node:assert/strict";
import { test } from "node:test";

import { CARRIER_REPLIES, carrierCommandFor, formatOutgoingSms, isCarrierKeyword } from "./smsCompliance.ts";

test("carrier commands accept punctuation and map to the required response", () => {
  assert.equal(carrierCommandFor("STOP."), "stop");
  assert.equal(carrierCommandFor("unsubscribe"), "stop");
  assert.equal(carrierCommandFor("START!"), "start");
  assert.equal(carrierCommandFor("Info"), "help");
  assert.equal(carrierCommandFor("stop now"), null);
  assert.equal(isCarrierKeyword("STOP."), true);
  assert.equal(CARRIER_REPLIES.stop.includes("Reply START"), true);
});

test("carrier replies still use the registered brand prefix", () => {
  const reply = formatOutgoingSms(CARRIER_REPLIES.help, false);
  assert.equal(reply.startsWith("Leaf Doctor by David: "), true);
  assert.equal(reply.includes("Reply STOP"), true);
});
