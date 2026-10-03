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
  assert.deepEqual([...DISEASE_KEYS], ["cercospora", "healthy", "miner", "phoma", "rust", "mites", "weevil"]);
});

test("Latin-script languages drop accents to stay on cheap GSM SMS", async () => {
  const { fitToSms } = await import("./smsReply.ts");
  const reply = fitToSms("Es la roya del café. Aplique cobre según su técnico.");
  assert.equal(reply, "Es la roya del cafe. Aplique cobre segun su tecnico.");
});

test("non-Latin scripts are kept and capped at the unicode SMS limit", async () => {
  const { fitToSms, SMS_MAX_UNICODE_CHARS } = await import("./smsReply.ts");
  const amharic = "ይህ የቡና ቅጠል ዝገት ነው። ";
  assert.equal(fitToSms(amharic), amharic.trim());
  const long = fitToSms(amharic.repeat(20));
  assert.ok([...long].length <= SMS_MAX_UNICODE_CHARS);
  assert.ok(long.endsWith("።"), "cut at a sentence end");
});

test("Spanish inverted punctuation does not force a unicode SMS", async () => {
  const { fitToSms, smsCharLimit, SMS_MAX_CHARS } = await import("./smsReply.ts");
  const reply = fitToSms("\u00bfVe polvo naranja debajo de la hoja? \u00a1Act\u00fae pronto!");
  assert.equal(reply, "Ve polvo naranja debajo de la hoja? Actue pronto!");
  assert.equal(smsCharLimit(reply), SMS_MAX_CHARS);
});
