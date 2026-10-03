import { Hono } from "hono";
import type { Advisor } from "./advisor.ts";
import { isCarrierKeyword } from "../../shared/src/index.ts";
import { lookupWetDays } from "../../shared/src/rainSource.ts";
import type { FetchLike } from "../../shared/src/rainSource.ts";
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
  rainFetch?: FetchLike;
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

function parseCoordinate(raw: string | undefined, limit: number): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
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

  app.get("/rain", async (c) => {
    const latitude = parseCoordinate(c.req.query("lat"), 90);
    const longitude = parseCoordinate(c.req.query("lon"), 180);
    if (latitude === null || longitude === null) return c.json({ error: "Send lat (-90 to 90) and lon (-180 to 180)" }, 400);
    const wetDays = await lookupWetDays(deps.rainFetch ?? fetch, latitude, longitude);
    if (!wetDays) return c.json({ error: "Rainfall data is not available right now" }, 503);
    c.header("Cache-Control", "public, max-age=3600");
    return c.json(wetDays);
  });

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

  app.post("/ask", async (c) => {
    if (!deps.hubToken) return c.json({ error: "Hub access is not configured: HUB_TOKEN is missing" }, 503);
    const bearer = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
    if (!constantTimeEqual(bearer, deps.hubToken)) return c.json({ error: "Unauthorized" }, 401);

    const ask = parseAskBody(await c.req.json().catch(() => null));
    if (!ask) return c.json({ error: "Send JSON with non-empty from and text" }, 400);
    if (!(await deps.rateLimit.allow(ask.from))) return c.json({ error: "Too many questions from this sender" }, 429);

    return c.json({ reply: await deps.advisor.advise(ask.from, ask.text) });
  });

  return app;
}
