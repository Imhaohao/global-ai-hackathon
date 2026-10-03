import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import { createClaudeAdvisor, type Advisor } from "./advisor.ts";
import { createApp, type SmsSender } from "./app.ts";

const AUTH_TOKEN = "test-twilio-auth-token";
const HUB_TOKEN = "test-hub-token";
const BASE_URL = "https://leaf.example.test";

function buildApp(advisor: Advisor = { advise: async () => "Rust. Spray copper." }) {
  const sent: { to: string; body: string }[] = [];
  const sendSms: SmsSender = async (to, body) => {
    sent.push({ to, body });
  };
  const app = createApp({ advisor, sendSms, twilioAuthToken: AUTH_TOKEN, publicBaseUrl: BASE_URL, hubToken: HUB_TOKEN });
  return { app, sent };
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

const flushAsyncReply = () => new Promise((resolve) => setImmediate(resolve));

test("signed Twilio SMS gets an empty TwiML ack and an SMS reply", async () => {
  const { app, sent } = buildApp();
  const response = await app.fetch(twilioRequest({ From: "+15550001111", Body: "orange powder" }));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<Response><\/Response>/);
  await flushAsyncReply();
  assert.deepEqual(sent, [{ to: "+15550001111", body: "Rust. Spray copper." }]);
});

test("forged Twilio signature is rejected and nothing is sent", async () => {
  const { app, sent } = buildApp();
  const response = await app.fetch(twilioRequest({ From: "+15550001111", Body: "hi" }, "forged"));
  assert.equal(response.status, 403);
  await flushAsyncReply();
  assert.equal(sent.length, 0);
});

test("one sender is capped at five replies per window", async () => {
  const { app, sent } = buildApp();
  for (let index = 0; index < 7; index++) {
    await app.fetch(twilioRequest({ From: "+15550002222", Body: `question ${index}` }));
  }
  await flushAsyncReply();
  assert.equal(sent.length, 5);
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

test("advisor falls back to the offline matcher when Claude is unreachable", async () => {
  const failingClient = {
    beta: { messages: { create: async () => Promise.reject(new Error("network down")) } },
  } as unknown as Anthropic;
  const originalError = console.error;
  console.error = () => {};
  try {
    const answer = await createClaudeAdvisor(failingClient).advise("+1", "orange powder under the leaves");
    assert.match(answer, /Coffee leaf rust/);
  } finally {
    console.error = originalError;
  }
});
