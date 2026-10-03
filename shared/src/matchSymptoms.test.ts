import assert from "node:assert/strict";
import { test } from "node:test";
import { DISEASES } from "./diseases.ts";
import { matchSymptoms } from "./matchSymptoms.ts";
import { buildOfflineReply, SMS_MAX_CHARS, toSmsSafeText } from "./smsReply.ts";

const confidentCases: [string, string][] = [
  ["orange powder under my leaves", "rust"],
  ["Leaves have yellow spots and orange dust underneath", "rust"],
  ["brown spots with a grey center and yellow halo", "cercospora"],
  ["there is a small worm inside the leaf, brown papery patches", "miner"],
  ["tips of the shoots go black, very cold and windy here", "phoma"],
  ["leaves are shiny dark green, nothing wrong", "healthy"],
];

for (const [message, expected] of confidentCases) {
  test(`"${message}" matches ${expected}`, () => {
    const match = matchSymptoms(message, DISEASES);
    assert.equal(match.kind, "confident");
    assert.equal(match.kind === "confident" && match.best.key, expected);
  });
}

test("unrelated text asks the farmer to describe the leaf", () => {
  const match = matchSymptoms("hello", DISEASES);
  assert.equal(match.kind, "noMatch");
  assert.match(buildOfflineReply(match, DISEASES), /what the coffee leaf looks like/);
});

test("words split across punctuation and capitals still match", () => {
  const match = matchSymptoms("ORANGE-POWDER!!", DISEASES);
  assert.equal(match.kind === "confident" && match.best.key, "rust");
});

test("every offline reply fits in three SMS segments and is plain ASCII", () => {
  const messages = [...confidentCases.map(([message]) => message), "hello", "brown spots"];
  for (const message of messages) {
    const reply = buildOfflineReply(matchSymptoms(message, DISEASES), DISEASES);
    assert.ok(reply.length <= SMS_MAX_CHARS, `${reply.length} chars for "${message}"`);
    assert.match(reply, /^[\x20-\x7e\n]+$/);
  }
});

test("smart punctuation is converted instead of forcing unicode SMS", () => {
  assert.equal(toSmsSafeText("it’s “bad” — 20°"), `it's "bad" - 20 degrees`);
});

test("disease key order matches the image model's output order", async () => {
  const { DISEASE_KEYS } = await import("./types.ts");
  assert.deepEqual([...DISEASE_KEYS], ["cercospora", "healthy", "miner", "phoma", "rust"]);
});
