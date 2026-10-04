import assert from "node:assert/strict";
import { test } from "node:test";
import { authLimitDecision, authLimitRules } from "./authRateLimit.ts";
import { createPhoneAuthApp, hashSessionToken, normalizeLoginPhone, SESSION_LIFETIME_MS, VerificationError, type AuthStore, type AccountSession, type VerificationProvider } from "./phoneAuth.ts";
import { createTwilioVerify } from "./twilioVerify.ts";

const PHONE = "+254712345678";
const VERIFICATION_SID = `VE${"a".repeat(32)}`;
const CREDENTIALS = { accountSid: `AC${"a".repeat(32)}`, authToken: "server-secret", serviceSid: `VA${"b".repeat(32)}` };

function fixture(providerOverride?: Partial<VerificationProvider>) {
  const sessions = new Map<string, AccountSession>();
  const used = new Set<string>();
  const attempts: string[] = [];
  let retry = 0;
  const store: AuthStore = {
    claimAttempt: async (phone, operation) => { attempts.push(`${operation}:${phone}`); return retry; },
    createSession: async (phone, hash, sid, expiresAt) => {
      if (used.has(sid)) return null;
      used.add(sid);
      const session = { accountId: "account123", phone, expiresAt };
      sessions.set(hash, session);
      return session;
    },
    findSession: async (hash) => sessions.get(hash) ?? null,
    revokeSession: async (hash) => { sessions.delete(hash); },
  };
  const sent: string[] = [];
  const provider: VerificationProvider = {
    send: async (phone) => { sent.push(phone); },
    check: async (_phone, code) => code === "123456" ? VERIFICATION_SID : null,
    ...providerOverride,
  };
  const app = createPhoneAuthApp(provider, store);
  return { app, store, sessions, attempts, sent, limit: (seconds: number) => { retry = seconds; } };
}

function post(app: ReturnType<typeof createPhoneAuthApp>, path: string, body: unknown) {
  return app.request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

test("SMS sign-in issues a hashed session only after a valid code, validates it, and revokes it", async () => {
  const { app, sessions, sent } = fixture();
  const send = await post(app, "/send-code", { phone: "+254 712 345 678" });
  assert.equal(send.status, 200);
  assert.equal(send.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(sent, [PHONE]);
  assert.equal(sessions.size, 0);
  const verified = await post(app, "/verify-code", { phone: PHONE, code: "123456" });
  assert.equal(verified.status, 200);
  const session = await verified.json();
  assert.match(session.token, /^[a-f0-9]{64}$/);
  assert.equal(session.phone, PHONE);
  assert.ok(Math.abs(session.expiresAt - Date.now() - SESSION_LIFETIME_MS) < 2000);
  assert.equal(sessions.has(session.token), false);
  assert.equal(sessions.has(await hashSessionToken(session.token)), true);
  const headers = { Authorization: `Bearer ${session.token}` };
  const check = await app.request("/session", { headers });
  assert.deepEqual(await check.json(), { accountId: "account123", phone: PHONE, expiresAt: session.expiresAt });
  assert.equal((await app.request("/logout", { method: "POST", headers })).status, 204);
  assert.equal((await app.request("/session", { headers })).status, 401);
  assert.equal((await app.request("/logout", { method: "POST", headers })).status, 204);
});

test("bad or expired codes, malformed bodies, and claimed tokens never authenticate", async () => {
  const { app, sessions, attempts } = fixture();
  assert.equal((await post(app, "/verify-code", { phone: PHONE, code: "000000" })).status, 401);
  assert.equal((await post(app, "/verify-code", { phone: PHONE, code: 123456 })).status, 401);
  assert.equal((await app.request("/send-code", { method: "POST", body: "{" })).status, 400);
  assert.equal((await post(app, "/send-code", { phone: "0712345678" })).status, 400);
  assert.equal((await app.request("/session", { headers: { Authorization: `Bearer ${"b".repeat(64)}` } })).status, 401);
  assert.equal(sessions.size, 0);
  assert.deepEqual(attempts, [`verify:${PHONE}`]);
});

test("oversized login bodies are rejected before contacting the provider", async () => {
  const { app, sent } = fixture();
  assert.equal((await post(app, "/send-code", { phone: PHONE, padding: "a".repeat(3000) })).status, 413);
  assert.equal(sent.length, 0);
});

test("provider approval cannot be replayed into a second session", async () => {
  const { app, sessions } = fixture();
  assert.equal((await post(app, "/verify-code", { phone: PHONE, code: "123456" })).status, 200);
  assert.equal((await post(app, "/verify-code", { phone: PHONE, code: "123456" })).status, 401);
  assert.equal(sessions.size, 1);
});

test("rate limits stop sends and verification before provider calls", async () => {
  const { app, limit, sent, sessions } = fixture();
  limit(57);
  for (const path of ["/send-code", "/verify-code"]) {
    const result = await post(app, path, { phone: PHONE, code: "123456" });
    assert.equal(result.status, 429);
    assert.equal(result.headers.get("Retry-After"), "57");
    assert.equal((await result.json()).retryAfterSeconds, 57);
  }
  assert.equal(sent.length, 0);
  assert.equal(sessions.size, 0);
});

test("provider outages and unconfigured SMS return recoverable errors without exposing details", async () => {
  const { app, store } = fixture({ send: async () => { throw new Error("secret provider response"); } });
  const response = await post(app, "/send-code", { phone: PHONE });
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("secret"), false);
  assert.equal((await post(createPhoneAuthApp(null, store), "/send-code", { phone: PHONE })).status, 503);
});

test("expired stored sessions are rejected by the HTTP boundary", async () => {
  const { app, sessions } = fixture();
  const token = "a".repeat(64);
  sessions.set(await hashSessionToken(token), { accountId: "a", phone: PHONE, expiresAt: Date.now() - 1 });
  assert.equal((await app.request("/session", { headers: { Authorization: `Bearer ${token}` } })).status, 401);
});

test("phone parsing requires country codes and never guesses or accepts letters", () => {
  assert.equal(normalizeLoginPhone("+254 (712) 345-678"), PHONE);
  for (const phone of [null, {}, "254712345678", "+0712345678", "+254abc712345678", "+1", `+${"1".repeat(16)}`]) {
    assert.equal(normalizeLoginPhone(phone), null);
  }
});

test("limits enforce resend cooldown and recover when a time window expires", () => {
  const rule = authLimitRules(PHONE, "send")[1];
  assert.equal(authLimitDecision([1000], 2000, rule).retryAfterSeconds, 59);
  assert.equal(authLimitDecision([1000], 61000, rule).retryAfterSeconds, 0);
  assert.equal(authLimitDecision([1000, 61000, 121000], 181000, rule).retryAfterSeconds, 420);
  assert.deepEqual(authLimitDecision([1000], 601000, rule), { times: [], retryAfterSeconds: 0 });
  assert.equal(authLimitRules(PHONE, "verify")[1].max, 10);
});

test("Twilio adapter sends server-authenticated form data and requires approval for the requested phone", async () => {
  const calls: { url: string; body: string }[] = [];
  const provider = createTwilioVerify(CREDENTIALS, async (url, options) => {
    assert.equal((options?.headers as Record<string, string>).Authorization, `Basic ${btoa(`${CREDENTIALS.accountSid}:${CREDENTIALS.authToken}`)}`);
    calls.push({ url: String(url), body: String(options?.body) });
    const checking = String(url).endsWith("/VerificationCheck");
    return Response.json({ status: checking ? "approved" : "pending", valid: true, sid: VERIFICATION_SID, to: PHONE, service_sid: CREDENTIALS.serviceSid });
  })!;
  await provider.send(PHONE, "sw");
  assert.equal(await provider.check(PHONE, "123456"), VERIFICATION_SID);
  assert.equal(new URLSearchParams(calls[0].body).get("Channel"), "sms");
  assert.equal(new URLSearchParams(calls[0].body).get("Locale"), "sw");
  assert.equal(new URLSearchParams(calls[1].body).get("Code"), "123456");
  const wrongPhone = createTwilioVerify(CREDENTIALS, async () => Response.json({ status: "approved", valid: true, to: "+15551234567", sid: VERIFICATION_SID, service_sid: CREDENTIALS.serviceSid }))!;
  await assert.rejects(wrongPhone.check(PHONE, "123456"), VerificationError);
});

test("Twilio pending codes, expired verification, throttling, and corrupt responses fail closed", async () => {
  const pending = createTwilioVerify(CREDENTIALS, async () => Response.json({ status: "pending", valid: false }))!;
  assert.equal(await pending.check(PHONE, "123456"), null);
  for (const [status, expected] of [[404, "invalid_code"], [429, "rate_limited"], [500, "unavailable"]] as const) {
    const provider = createTwilioVerify(CREDENTIALS, async () => Response.json({}, { status }))!;
    await assert.rejects(provider.check(PHONE, "123456"), (error: unknown) => error instanceof VerificationError && error.code === expected);
  }
  const corrupt = createTwilioVerify(CREDENTIALS, async () => new Response("bad"))!;
  await assert.rejects(corrupt.send(PHONE, "en"), VerificationError);
  assert.equal(createTwilioVerify({ ...CREDENTIALS, serviceSid: "" }), null);
});
