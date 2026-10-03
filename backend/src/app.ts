import { Hono } from "hono";
import type { Advisor } from "./advisor.ts";
import { isCarrierKeyword } from "../../shared/src/index.ts";
import { privacyPolicyPage, termsPage, textUsPage } from "./compliancePages.ts";
import { constantTimeEqual, isValidTwilioSignature } from "./twilio.ts";

export interface ReplyRateLimit {
  allow(sender: string): Promise<boolean>;
}

export interface AppDependencies {
  advisor: Advisor;
  queueSmsReply: (from: string, question: string) => Promise<void>;
  rateLimit: ReplyRateLimit;
  twilioAuthToken: string;
  publicBaseUrl: string;
  hubToken: string;
}

const EMPTY_TWIML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
const MAX_QUESTION_CHARS = 1600;

function stringParams(body: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function maskPhone(phone: string): string {
  return `...${phone.slice(-4)}`;
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
  const smsWebhookUrl = `${deps.publicBaseUrl.replace(/\/$/, "")}/sms`;

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/privacy", (c) => c.html(privacyPolicyPage));
  app.get("/terms", (c) => c.html(termsPage));
  app.get("/text-us", (c) => c.html(textUsPage));

  app.post("/sms", async (c) => {
    if (!deps.twilioAuthToken) return c.text("SMS is not configured: TWILIO_AUTH_TOKEN is missing", 503);
    const params = stringParams(await c.req.parseBody());
    const signature = c.req.header("X-Twilio-Signature") ?? "";
    if (!(await isValidTwilioSignature(deps.twilioAuthToken, signature, smsWebhookUrl, params))) {
      return c.text("Invalid Twilio signature", 403);
    }

    const from = params.From ?? "";
    const question = (params.Body ?? "").trim().slice(0, MAX_QUESTION_CHARS);
    const isQuestion = question.length > 0 && !isCarrierKeyword(question);
    if (from && isQuestion && (await deps.rateLimit.allow(from))) {
      await deps.queueSmsReply(from, question);
    }
    return c.body(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  });

  const hubAuthFailure = (authorization: string | undefined) => {
    if (!deps.hubToken) return { error: "Hub access is not configured: HUB_TOKEN is missing", status: 503 as const };
    const bearer = (authorization ?? "").replace(/^Bearer /, "");
    return constantTimeEqual(bearer, deps.hubToken) ? null : { error: "Unauthorized", status: 401 as const };
  };

  app.post("/hub/check", (c) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    return failure ? c.json({ error: failure.error }, failure.status) : c.body(null, 204);
  });

  app.post("/ask", async (c) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    if (failure) return c.json({ error: failure.error }, failure.status);

    const ask = parseAskBody(await c.req.json().catch(() => null));
    if (!ask) return c.json({ error: "Send JSON with non-empty from and text" }, 400);
    if (!(await deps.rateLimit.allow(ask.from))) return c.json({ error: "Too many questions from this sender" }, 429);

    return c.json({ reply: await deps.advisor.advise(ask.from, ask.text) });
  });

  return app;
}
