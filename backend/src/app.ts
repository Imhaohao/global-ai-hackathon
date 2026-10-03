import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import twilio from "twilio";
import type { Advisor } from "./advisor.ts";
import { SenderRateLimit } from "./senderRateLimit.ts";

export type SmsSender = (to: string, body: string) => Promise<void>;

export interface AppDependencies {
  advisor: Advisor;
  sendSms: SmsSender;
  twilioAuthToken: string;
  publicBaseUrl: string;
  hubToken: string;
  rateLimit?: SenderRateLimit;
}

const EMPTY_TWIML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
const MAX_QUESTION_CHARS = 1600;

function tokensMatch(given: string, expected: string): boolean {
  const givenBytes = Buffer.from(given);
  const expectedBytes = Buffer.from(expected);
  return givenBytes.length === expectedBytes.length && timingSafeEqual(givenBytes, expectedBytes);
}

function stringParams(body: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function maskPhone(phone: string): string {
  return `...${phone.slice(-4)}`;
}

async function replyBySms(deps: AppDependencies, from: string, question: string): Promise<void> {
  try {
    const answer = await deps.advisor.advise(from, question);
    await deps.sendSms(from, answer);
  } catch (error) {
    console.error(`Could not reply to ${maskPhone(from)}:`, error);
  }
}

function parseAskBody(body: unknown): { from: string; text: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { from, text } = body as Record<string, unknown>;
  if (typeof from !== "string" || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUESTION_CHARS) return null;
  return { from, text: trimmed };
}

export function createApp(deps: AppDependencies): Hono {
  const app = new Hono();
  const rateLimit = deps.rateLimit ?? new SenderRateLimit();
  const smsWebhookUrl = `${deps.publicBaseUrl.replace(/\/$/, "")}/sms`;

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/sms", async (c) => {
    const params = stringParams(await c.req.parseBody());
    const signature = c.req.header("X-Twilio-Signature") ?? "";
    if (!twilio.validateRequest(deps.twilioAuthToken, signature, smsWebhookUrl, params)) {
      return c.text("Invalid Twilio signature", 403);
    }

    const from = params.From ?? "";
    const question = (params.Body ?? "").trim().slice(0, MAX_QUESTION_CHARS);
    if (from && question && rateLimit.allow(from)) {
      void replyBySms(deps, from, question);
    }
    return c.body(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  });

  app.post("/ask", async (c) => {
    const bearer = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
    if (!tokensMatch(bearer, deps.hubToken)) return c.json({ error: "Unauthorized" }, 401);

    const ask = parseAskBody(await c.req.json().catch(() => null));
    if (!ask) return c.json({ error: "Send JSON with non-empty from and text" }, 400);
    if (!rateLimit.allow(ask.from)) return c.json({ error: "Too many questions from this sender" }, 429);

    return c.json({ reply: await deps.advisor.advise(ask.from, ask.text) });
  });

  return app;
}
