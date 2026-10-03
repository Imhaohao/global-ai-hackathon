import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import { evaluateReply } from "../../shared/src/index.ts";
import { createClaudeAdvisor, type Advisor } from "./advisor.ts";
import { createApp, type AppDependencies, type ReplyRateLimit } from "./app.ts";
import { InMemoryConversationHistory } from "./conversationStore.ts";
import { expectedTwilioSignature } from "./twilio.ts";

const AUTH_TOKEN = "test-twilio-auth-token";
const HUB_TOKEN = "test-hub-token";
const BASE_URL = "https://leaf.example.test";

function inMemoryRateLimit(): ReplyRateLimit {
  const timesBySender = new Map<string, number[]>();
  return {
    async allow(sender) {
      const decision = evaluateReply(timesBySender.get(sender) ?? [], Date.now());
      timesBySender.set(sender, decision.recentReplyTimes);
      return decision.allowed;
    },
  };
}

function buildApp(overrides: Partial<AppDependencies> = {}) {
  const queued: { from: string; question: string }[] = [];
  const advisor: Advisor = { advise: async () => "Rust. Spray copper." };
  const app = createApp({
    advisor,
    queueSmsReply: async (from, question) => {
      queued.push({ from, question });
    },
    rateLimit: inMemoryRateLimit(),
    twilioAuthToken: AUTH_TOKEN,
    publicBaseUrl: BASE_URL,
    hubToken: HUB_TOKEN,
    ...overrides,
  });
  return { app, queued };
}

function twilioRequest(params: Record<string, string>, signature?: string): Request {
  const expected = twilio.getExpectedTwilioSignature(AUTH_TOKEN, `${BASE_URL}/sms`, params);
  return new Request(`${BASE_URL}/sms`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": signature ?? expected },
    body: new URLSearchParams(params),
  });
}

function askRequest(body: unknown, token = HUB_TOKEN): Request {
  return new Request(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test("Web Crypto signature matches the official Twilio SDK, including non-ASCII text", async () => {
  const params = { From: "+251911000000", Body: "ይህ ዝገት ነው? café", To: "+15550000000" };
  const ours = await expectedTwilioSignature(AUTH_TOKEN, `${BASE_URL}/sms`, params);
  assert.equal(ours, twilio.getExpectedTwilioSignature(AUTH_TOKEN, `${BASE_URL}/sms`, params));
});

test("signed Twilio SMS gets an empty TwiML ack and queues one reply", async () => {
  const { app, queued } = buildApp();
  const response = await app.fetch(twilioRequest({ From: "+15550001111", Body: "orange powder" }));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<Response><\/Response>/);
  assert.deepEqual(queued, [{ from: "+15550001111", question: "orange powder" }]);
});

test("forged Twilio signature is rejected and nothing is queued", async () => {
  const { app, queued } = buildApp();
  const response = await app.fetch(twilioRequest({ From: "+15550001111", Body: "hi" }, "forged"));
  assert.equal(response.status, 403);
  assert.equal(queued.length, 0);
});

test("missing secrets fail closed instead of accepting empty credentials", async () => {
  const { app: noTwilio, queued } = buildApp({ twilioAuthToken: "" });
  const forgedWithEmptyKey = twilio.getExpectedTwilioSignature("", `${BASE_URL}/sms`, { From: "+1", Body: "x" });
  const sms = await noTwilio.fetch(twilioRequest({ From: "+1", Body: "x" }, forgedWithEmptyKey));
  assert.equal(sms.status, 503);
  assert.equal(queued.length, 0);

  const { app: noHub } = buildApp({ hubToken: "" });
  assert.equal((await noHub.fetch(askRequest({ from: "+1", text: "x" }, ""))).status, 503);
});

test("one sender is capped at five replies per window", async () => {
  const { app, queued } = buildApp();
  for (let index = 0; index < 7; index++) {
    await app.fetch(twilioRequest({ From: "+15550002222", Body: `question ${index}` }));
  }
  assert.equal(queued.length, 5);
});

test("/ask answers the hub phone with a valid token", async () => {
  const { app } = buildApp();
  const response = await app.fetch(askRequest({ from: "+15550003333", text: "orange powder" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reply: "Rust. Spray copper." });
});

test("/ask rejects a wrong token and malformed bodies", async () => {
  const { app } = buildApp();
  assert.equal((await app.fetch(askRequest({ from: "x", text: "y" }, "wrong"))).status, 401);
  assert.equal((await app.fetch(askRequest({ from: "x", text: "   " }))).status, 400);
  assert.equal((await app.fetch(askRequest({ text: "no sender" }))).status, 400);
});

test("conversation history resets after a day of silence", async () => {
  let now = 0;
  const store = new InMemoryConversationHistory(() => now);
  await store.append("+1", "orange powder?", "Rust.");
  assert.equal((await store.history("+1")).length, 2);
  now = 25 * 60 * 60 * 1000;
  assert.deepEqual(await store.history("+1"), []);
});

test("advisor falls back to the offline matcher when the Claude client cannot even be built", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const advisor = createClaudeAdvisor(() => {
      throw new Error("ANTHROPIC_API_KEY is missing");
    }, new InMemoryConversationHistory());
    assert.match(await advisor.advise("+1", "orange powder under the leaves"), /Coffee leaf rust/);
  } finally {
    console.error = originalError;
  }
});

test("advisor falls back to the offline matcher when Claude is unreachable", async () => {
  const failingClient = {
    beta: { messages: { create: async () => Promise.reject(new Error("network down")) } },
  } as unknown as Anthropic;
  const originalError = console.error;
  console.error = () => {};
  try {
    const advisor = createClaudeAdvisor(() => failingClient, new InMemoryConversationHistory());
    assert.match(await advisor.advise("+1", "orange powder under the leaves"), /Coffee leaf rust/);
  } finally {
    console.error = originalError;
  }
});

test("carrier keywords like STOP and HELP get no bot reply", async () => {
  const { app, queued } = buildApp();
  for (const keyword of ["STOP", "stop.", "Help", "START"]) {
    const response = await app.fetch(twilioRequest({ From: "+15550004444", Body: keyword }));
    assert.equal(response.status, 200);
  }
  assert.equal(queued.length, 0);
});

test("compliance pages carry the statements Twilio reviewers check for", async () => {
  const { app } = buildApp();
  const privacy = await (await app.fetch(new Request(`${BASE_URL}/privacy`))).text();
  assert.match(privacy, /<title>Privacy Policy/);
  assert.match(privacy, /We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes\./);
  assert.match(privacy, /Leaf Doctor is operated by David/);

  const terms = await (await app.fetch(new Request(`${BASE_URL}/terms`))).text();
  assert.match(terms, /<title>Terms &amp; Conditions|<title>Terms & Conditions/);
  assert.match(terms, /SMS Terms/);
  assert.match(terms, /[Mm]essage and data rates may apply/);
  assert.match(terms, /Leaf Doctor is operated by David/);

  const textUs = await (await app.fetch(new Request(`${BASE_URL}/text-us`)));
  assert.equal(textUs.status, 200);
  assert.match(await textUs.text(), /Reply STOP to opt out/);
});

type RainFetch = NonNullable<AppDependencies["rainFetch"]>;

function powerFetch(body: unknown, ok = true) {
  const urls: string[] = [];
  const rainFetch: RainFetch = async (url) => {
    urls.push(url);
    return { ok, status: ok ? 200 : 500, json: async () => body } as Awaited<ReturnType<RainFetch>>;
  };
  return { rainFetch, urls };
}

test("GET /rain returns wet days from the rainfall source for a rounded point", async () => {
  const series = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`202609${17 + index}`, index % 2 === 0 ? 2 : 0]));
  const { rainFetch, urls } = powerFetch({ properties: { parameter: { PRECTOTCORR: series } } });
  const { app } = buildApp({ rainFetch });
  const response = await app.fetch(new Request(`${BASE_URL}/rain?lat=-1.146&lon=36.961`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control") ?? "", /max-age=3600/);
  const body = (await response.json()) as { wetDaysLast7: number; source: string; asOf: string };
  assert.equal(body.source, "NASA POWER");
  assert.equal(body.wetDaysLast7, 3);
  assert.equal(body.asOf, "2026-09-30");
  assert.match(urls[0], /latitude=-1\.1&longitude=37/);
});

test("GET /rain rejects missing or out-of-range coordinates without calling the source", async () => {
  const { rainFetch, urls } = powerFetch({});
  const { app } = buildApp({ rainFetch });
  for (const query of ["", "?lat=1", "?lat=abc&lon=1", "?lat=91&lon=0", "?lat=0&lon=181"]) {
    const response = await app.fetch(new Request(`${BASE_URL}/rain${query}`));
    assert.equal(response.status, 400, query);
  }
  assert.equal(urls.length, 0);
});

test("GET /rain answers 503 when the rainfall source fails", async () => {
  const { rainFetch } = powerFetch({}, false);
  const { app } = buildApp({ rainFetch });
  const response = await app.fetch(new Request(`${BASE_URL}/rain?lat=-1.1&lon=36.9`));
  assert.equal(response.status, 503);
});
