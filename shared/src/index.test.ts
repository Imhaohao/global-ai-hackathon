import assert from "node:assert/strict";
import { test } from "node:test";

import * as shared from "./index.ts";

test("the shared entry point exports the action card, case summary, contacts and rain helpers", () => {
  for (const name of ["buildActionCard", "formatCaseSummarySms", "contactsForFarmer", "verifiedContacts", "fetchWetDays"]) {
    assert.equal(typeof (shared as Record<string, unknown>)[name], "function", name);
  }
});
