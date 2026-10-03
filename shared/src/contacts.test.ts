import assert from "node:assert/strict";
import { test } from "node:test";

import { contactsForFarmer, COOPERATIVE_OFFICER_ID, KNOWN_CONTACTS, verifiedContacts } from "./contacts.ts";

test("a verified contact carries a source URL and a verification date", () => {
  for (const contact of verifiedContacts()) {
    assert.match(contact.source, /^https:\/\//);
    assert.match(contact.verifiedOn ?? "", /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("unverified numbers never reach farmer-facing output", () => {
  const unverifiedPhones = KNOWN_CONTACTS.filter((contact) => !contact.verified).map((contact) => contact.phone);
  assert.ok(unverifiedPhones.length > 0);
  const shown = contactsForFarmer("0700000000").map((contact) => contact.phone);
  for (const phone of unverifiedPhones) assert.ok(!shown.includes(phone));
});

test("the cooperative officer entry is always there and takes the saved number", () => {
  const empty = contactsForFarmer().find((contact) => contact.id === COOPERATIVE_OFFICER_ID);
  assert.equal(empty?.phone, "");
  const saved = contactsForFarmer(" 0712345678 ").find((contact) => contact.id === COOPERATIVE_OFFICER_ID);
  assert.equal(saved?.phone, "0712345678");
});
