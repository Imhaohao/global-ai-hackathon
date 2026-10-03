import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { createClaudeAdvisor, type Advisor } from "../src/advisor.ts";
import { isSupportedImageType, maskPhone } from "../src/app.ts";
import { bytesToBase64 } from "../src/base64.ts";
import { createPhotoAdvisor, MAX_IMAGE_BASE64_CHARS, type PhotoAdvisor } from "../src/photoAdvisor.ts";
import { sendTwilioSms, type TwilioCredentials } from "../src/twilio.ts";
import { formatOutgoingSms } from "../../shared/src/index.ts";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it with: npx convex env set ${name} <value>`);
  return value;
}

export function advisorFor(ctx: ActionCtx): Advisor {
  return createClaudeAdvisor(() => new Anthropic(), historyFor(ctx));
}

function historyFor(ctx: ActionCtx) {
  return {
    history: (phone: string) => ctx.runQuery(internal.phoneSessions.history, { phone }),
    append: async (phone: string, question: string, answer: string) => {
      await ctx.runMutation(internal.phoneSessions.recordExchange, { phone, question, answer });
    },
  };
}

export function photoAdvisorFor(ctx: ActionCtx): PhotoAdvisor {
  return createPhotoAdvisor(() => new Anthropic(), historyFor(ctx));
}

const UNSUPPORTED_PHOTO_REPLY = "I could not open that picture. Please send it as a normal photo, or tell me in words what the leaf looks like.";

async function downloadTwilioMedia(credentials: TwilioCredentials, url: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}` },
  });
  if (!response.ok) throw new Error(`Twilio media download failed with ${response.status}`);
  const mediaType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  return { base64: bytesToBase64(new Uint8Array(await response.arrayBuffer())), mediaType };
}

async function photoReply(ctx: ActionCtx, credentials: TwilioCredentials, from: string, question: string, mediaUrl: string) {
  const { base64, mediaType } = await downloadTwilioMedia(credentials, mediaUrl);
  if (!isSupportedImageType(mediaType) || base64.length > MAX_IMAGE_BASE64_CHARS) return UNSUPPORTED_PHOTO_REPLY;
  return photoAdvisorFor(ctx).advisePhoto(from, { base64, mediaType, caption: question });
}

export const answerPhoto = internalAction({
  args: { from: v.string(), caption: v.string(), base64: v.string(), mediaType: v.string() },
  returns: v.string(),
  handler: (ctx, { from, caption, base64, mediaType }) =>
    isSupportedImageType(mediaType)
      ? photoAdvisorFor(ctx).advisePhoto(from, { base64, mediaType, caption })
      : Promise.resolve(UNSUPPORTED_PHOTO_REPLY),
});

export const answer = internalAction({
  args: { from: v.string(), question: v.string() },
  returns: v.string(),
  handler: (ctx, { from, question }) => advisorFor(ctx).advise(from, question),
});

export const replyBySms = internalAction({
  args: { from: v.string(), question: v.string(), mediaUrl: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { from, question, mediaUrl }) => {
    const credentials = {
      accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
      authToken: requireEnv("TWILIO_AUTH_TOKEN"),
      fromNumber: requireEnv("TWILIO_PHONE_NUMBER"),
    };
    const isFirstReply = (await ctx.runQuery(internal.phoneSessions.history, { phone: from })).length === 0;
    const answer = mediaUrl
      ? await photoReply(ctx, credentials, from, question, mediaUrl).catch(() => UNSUPPORTED_PHOTO_REPLY)
      : await advisorFor(ctx).advise(from, question);
    const reply = formatOutgoingSms(answer, isFirstReply);
    try {
      await sendTwilioSms(credentials, from, reply);
    } catch (error) {
      console.error(`Could not reply to ${maskPhone(from)}:`, error);
    }
    return null;
  },
});
