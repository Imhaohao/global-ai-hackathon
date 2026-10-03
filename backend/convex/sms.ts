import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { createClaudeAdvisor, type Advisor } from "../src/advisor.ts";
import { maskPhone } from "../src/app.ts";
import { sendTwilioSms } from "../src/twilio.ts";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it with: npx convex env set ${name} <value>`);
  return value;
}

export function advisorFor(ctx: ActionCtx): Advisor {
  return createClaudeAdvisor(() => new Anthropic(), {
    history: (phone) => ctx.runQuery(internal.phoneSessions.history, { phone }),
    append: async (phone, question, answer) => {
      await ctx.runMutation(internal.phoneSessions.recordExchange, { phone, question, answer });
    },
  });
}

export const answer = internalAction({
  args: { from: v.string(), question: v.string() },
  returns: v.string(),
  handler: (ctx, { from, question }) => advisorFor(ctx).advise(from, question),
});

export const replyBySms = internalAction({
  args: { from: v.string(), question: v.string() },
  returns: v.null(),
  handler: async (ctx, { from, question }) => {
    const reply = await advisorFor(ctx).advise(from, question);
    const credentials = {
      accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
      authToken: requireEnv("TWILIO_AUTH_TOKEN"),
      fromNumber: requireEnv("TWILIO_PHONE_NUMBER"),
    };
    try {
      await sendTwilioSms(credentials, from, reply);
    } catch (error) {
      console.error(`Could not reply to ${maskPhone(from)}:`, error);
    }
    return null;
  },
});
