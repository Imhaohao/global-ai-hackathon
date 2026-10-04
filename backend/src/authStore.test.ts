import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema.ts";
import { internal } from "../convex/_generated/api.js";
import { createPhoneAuthApp, hashSessionToken, type AuthStore } from "./phoneAuth.ts";

const modules = {
  "./auth.ts": () => import("../convex/auth.ts"),
  "./_generated/server.js": () => import("../convex/_generated/server.js"),
};
const PHONE = "+254712345678";

test("Convex auth persists accounts, claims limits atomically, blocks replay, and revokes sessions", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const db = convexTest(schema, modules);
  const store: AuthStore = {
    claimAttempt: (phone, operation) => db.mutation(internal.auth.claimAttempt, { phone, operation }),
    createSession: (phone, tokenHash, verificationSid, expiresAt) => db.mutation(internal.auth.createSession, { phone, tokenHash, verificationSid, expiresAt }),
    findSession: (tokenHash) => db.query(internal.auth.findSession, { tokenHash }),
    revokeSession: async (tokenHash) => { await db.mutation(internal.auth.revokeSession, { tokenHash }); },
  };

  const sends = await Promise.all(Array.from({ length: 12 }, () => store.claimAttempt(PHONE, "send")));
  assert.equal(sends.filter((wait) => wait === 0).length, 1);
  const checks = await Promise.all(Array.from({ length: 14 }, () => store.claimAttempt(PHONE, "verify")));
  assert.equal(checks.filter((wait) => wait === 0).length, 10);

  const tokenHash = await hashSessionToken("a".repeat(64));
  const expiresAt = Date.now() + 3_600_000;
  const first = await store.createSession(PHONE, tokenHash, "VEfirst", expiresAt);
  assert.ok(first);
  assert.deepEqual(await store.findSession(tokenHash), first);
  const again = await store.createSession(PHONE, "secondhash", "VEsecond", expiresAt);
  assert.equal(again?.accountId, first.accountId);
  const other = await store.createSession("+15551234567", "otherhash", "VEthird", expiresAt);
  assert.notEqual(other?.accountId, first.accountId);
  assert.equal(await store.createSession(PHONE, "replayhash", "VEfirst", expiresAt), null);
  await store.revokeSession(tokenHash);
  assert.equal(await store.findSession(tokenHash), null);
  assert.equal(await store.createSession(PHONE, "logoutreplay", "VEfirst", expiresAt), null);
  await store.revokeSession(tokenHash);

  const saved = await db.run((ctx) => ctx.db.query("authSessions").collect());
  const revoked = saved.find((session) => session.tokenHash === tokenHash)!;
  assert.equal(revoked.expiresAt, 0);
  await db.mutation(internal.auth.expireSession, { sessionId: revoked._id });
  assert.equal((await db.run((ctx) => ctx.db.query("authSessions").collect())).length, 2);
  assert.equal((await db.run((ctx) => ctx.db.query("accounts").collect())).length, 2);

  const app = createPhoneAuthApp({ send: async () => {}, check: async () => "VEintegration" }, store);
  const response = await app.request("/verify-code", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "+15551234567", code: "123456" }),
  });
  assert.equal(response.status, 200);
  const session = await response.json();
  assert.equal(session.accountId, other!.accountId);
  const headers = { Authorization: `Bearer ${session.token}` };
  assert.equal((await app.request("/session", { headers })).status, 200);
  assert.equal((await app.request("/logout", { method: "POST", headers })).status, 204);
  assert.equal((await app.request("/session", { headers })).status, 401);
});

test("global SMS budget limits attempts across distinct phone numbers", async () => {
  const db = convexTest(schema, modules);
  for (let i = 0; i < 100; i++) {
    assert.equal(await db.mutation(internal.auth.claimAttempt, { phone: `+1555${String(i).padStart(7, "0")}`, operation: "send" }), 0);
  }
  assert.ok(await db.mutation(internal.auth.claimAttempt, { phone: "+15559999999", operation: "send" }) > 0);
  assert.equal((await db.run((ctx) => ctx.db.query("authAttempts").withIndex("by_key", (q) => q.eq("key", "send:global")).unique()))?.times.length, 100);
});
