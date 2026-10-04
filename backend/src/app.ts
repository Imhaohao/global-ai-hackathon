import { Hono } from "hono";
import type { Advisor } from "./advisor.ts";
import { MAX_IMAGE_BASE64_CHARS, SUPPORTED_IMAGE_TYPES, type LeafPhoto, type PhotoAdvisor, type SupportedImageType } from "./photoAdvisor.ts";
import { CONVERSATION_REPLIES_PER_WINDOW, isCarrierKeyword, MAX_REPLIES_PER_WINDOW } from "../../shared/src/index.ts";
import { isStopRequest } from "../../shared/src/neighbourAlerts.ts";
import { createAlertRoutes, type NeighbourAlertService } from "./alertRoutes.ts";
import { lookupWetDays } from "../../shared/src/rainSource.ts";
import type { FetchLike } from "../../shared/src/rainSource.ts";
import { privacyPolicyPage, termsPage, textUsPage } from "./compliancePages.ts";
import { constantTimeEqual, isValidTwilioSignature } from "./twilio.ts";
import { createPhoneAuthApp, type AuthStore, type VerificationProvider } from "./phoneAuth.ts";

export interface ReplyRateLimit {
  allow(sender: string, maxReplies: number): Promise<boolean>;
}

export interface InboundMedia {
  url: string;
  contentType: string;
}

export interface AppDependencies {
  advisor: Advisor;
  photoAdvisor: PhotoAdvisor;
  queueSmsReply: (from: string, question: string, media: InboundMedia | null) => Promise<void>;
  rateLimit: ReplyRateLimit;
  twilioAuthToken: string;
  publicBaseUrl: string;
  hubToken: string;
  alerts: NeighbourAlertService;
  rainFetch?: FetchLike;
  phoneAuth?: { provider: VerificationProvider | null; store: AuthStore };
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

export function isSupportedImageType(value: unknown): value is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(value as SupportedImageType);
}

function inboundMedia(params: Record<string, string>): InboundMedia | null {
  const url = params.MediaUrl0;
  const contentType = params.MediaContentType0 ?? "";
  return Number(params.NumMedia ?? 0) > 0 && url && contentType.startsWith("image/") ? { url, contentType } : null;
}

function parseAskImageBody(body: unknown): { from: string; photo: LeafPhoto } | null {
  if (typeof body !== "object" || body === null) return null;
  const { from, caption, image } = body as Record<string, unknown>;
  const { base64, mediaType } = (image ?? {}) as Record<string, unknown>;
  if (typeof from !== "string" || typeof base64 !== "string" || !isSupportedImageType(mediaType)) return null;
  if (base64.length === 0 || base64.length > MAX_IMAGE_BASE64_CHARS) return null;
  const captionText = typeof caption === "string" ? caption.trim().slice(0, MAX_QUESTION_CHARS) : "";
  return { from, photo: { base64, mediaType, caption: captionText } };
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
  if (deps.phoneAuth) app.route("/auth", createPhoneAuthApp(deps.phoneAuth.provider, deps.phoneAuth.store));

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
    if (from && isStopRequest(question)) await deps.alerts.leave(from, "twilio");
    const media = inboundMedia(params);
    const isQuestion = media !== null || (question.length > 0 && !isCarrierKeyword(question));
    if (from && isQuestion && (await deps.rateLimit.allow(from, MAX_REPLIES_PER_WINDOW))) {
      await deps.queueSmsReply(from, question, media);
    }
    return c.body(EMPTY_TWIML, 200, { "Content-Type": "text/xml" });
  });

  const hubAuthFailure = (authorization: string | undefined) => {
    if (!deps.hubToken) return { error: "Hub access is not configured: HUB_TOKEN is missing", status: 503 as const };
    const bearer = (authorization ?? "").replace(/^Bearer /, "");
    return constantTimeEqual(bearer, deps.hubToken) ? null : { error: "Unauthorized", status: 401 as const };
  };

  app.route("/", createAlertRoutes(deps.alerts, hubAuthFailure));

  app.post("/hub/check", (c) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    return failure ? c.json({ error: failure.error }, failure.status) : c.body(null, 204);
  });

  app.post("/ask-image", async (c) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    if (failure) return c.json({ error: failure.error }, failure.status);

    const ask = parseAskImageBody(await c.req.json().catch(() => null));
    if (!ask) return c.json({ error: "Send JSON with from and image { base64, mediaType: jpeg, png, webp or gif }" }, 400);
    if (!(await deps.rateLimit.allow(ask.from, CONVERSATION_REPLIES_PER_WINDOW))) {
      return c.json({ error: "Too many questions from this sender" }, 429);
    }
    return c.json({ reply: await deps.photoAdvisor.advisePhoto(ask.from, ask.photo) });
  });

  app.post("/ask", async (c) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    if (failure) return c.json({ error: failure.error }, failure.status);

    const ask = parseAskBody(await c.req.json().catch(() => null));
    if (!ask) return c.json({ error: "Send JSON with non-empty from and text" }, 400);
    if (!(await deps.rateLimit.allow(ask.from, CONVERSATION_REPLIES_PER_WINDOW))) return c.json({ error: "Too many questions from this sender" }, 429);

    return c.json({ reply: await deps.advisor.advise(ask.from, ask.text) });
  });

  return app;
}
