import assert from "node:assert/strict";
import { test } from "node:test";

import { KNOWN_CONTACTS } from "./contacts.ts";
import { isSeedCheckRequest, seedCheckContact, seedCheckCopy, seedCheckSms } from "./seedCheck.ts";
import { COMPLIANCE_OVERHEAD_CHARS } from "./smsCompliance.ts";
import { SMS_MAX_CHARS } from "./smsReply.ts";

test("the seed check uses the verified KEPHIS short code", () => {
  assert.equal(seedCheckContact()?.phone, "1393");
});

test("an unverified KEPHIS entry is never offered", () => {
  const unverified = KNOWN_CONTACTS.map((contact) => ({ ...contact, verified: false }));
  assert.equal(seedCheckContact(unverified), null);
  assert.equal(seedCheckCopy("en", null), null);
  assert.match(seedCheckSms("en", null), /field officer/);
});

test("seed check commands are recognised in English, Swahili and with punctuation", () => {
  for (const text of ["seed", "SEED", " Seed! ", "check seed", "mbegu", "Kephis"]) assert.equal(isSeedCheckRequest(text), true, text);
});

test("questions that only mention seed are not treated as the command", () => {
  for (const text of ["my seedlings have orange spots", "seed packet had holes in the leaves", "seeds?? orange powder"]) {
    assert.equal(isSeedCheckRequest(text), false, text);
  }
});

test("the seed check SMS lists the three steps with the short code and fits one reply with compliance text", () => {
  const sms = seedCheckSms("en");
  assert.match(sms, /1\) Find the KEPHIS sticker/);
  assert.match(sms, /3\) Text the code to 1393/);
  assert.ok(sms.length + COMPLIANCE_OVERHEAD_CHARS <= SMS_MAX_CHARS, `${sms.length} chars`);
});

test("unreviewed Swahili falls back to English", () => {
  assert.deepEqual(seedCheckCopy("sw"), seedCheckCopy("en"));
});
