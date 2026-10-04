import { v } from "convex/values";
import { authLimitDecision, authLimitRules } from "../src/authRateLimit.ts";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

const sessionValidator = v.object({ accountId: v.string(), phone: v.string(), expiresAt: v.number() });

export const claimAttempt = internalMutation({
  args: { phone: v.string(), operation: v.union(v.literal("send"), v.literal("verify")) },
  returns: v.number(),
  handler: async (ctx, { phone, operation }) => {
    const now = Date.now();
    const buckets = await Promise.all(authLimitRules(phone, operation).map(async (rule) => {
      const record = await ctx.db.query("authAttempts").withIndex("by_key", (q) => q.eq("key", rule.key)).unique();
      return { rule, record, decision: authLimitDecision(record?.times ?? [], now, rule) };
    }));
    const retryAfterSeconds = Math.max(...buckets.map(({ decision }) => decision.retryAfterSeconds));
    if (retryAfterSeconds > 0) return retryAfterSeconds;
    for (const { rule, record, decision } of buckets) {
      const times = [...decision.times, now];
      if (record) await ctx.db.patch(record._id, { times });
      else await ctx.db.insert("authAttempts", { key: rule.key, times });
    }
    return 0;
  },
});

export const createSession = internalMutation({
  args: { phone: v.string(), tokenHash: v.string(), verificationSid: v.string(), expiresAt: v.number() },
  returns: v.union(sessionValidator, v.null()),
  handler: async (ctx, { phone, tokenHash, verificationSid, expiresAt }) => {
    const used = await ctx.db.query("authSessions").withIndex("by_verification", (q) => q.eq("verificationSid", verificationSid)).unique();
    if (used) return null;
    const account = await ctx.db.query("accounts").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const accountId = account?._id ?? await ctx.db.insert("accounts", { phone });
    const sessionId = await ctx.db.insert("authSessions", { accountId, tokenHash, verificationSid, expiresAt });
    await ctx.scheduler.runAt(expiresAt, internal.auth.expireSession, { sessionId });
    return { accountId, phone, expiresAt };
  },
});

export const findSession = internalQuery({
  args: { tokenHash: v.string() },
  returns: v.union(sessionValidator, v.null()),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db.query("authSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
    if (!session || session.expiresAt <= Date.now()) return null;
    const account = await ctx.db.get(session.accountId);
    return account ? { accountId: account._id, phone: account.phone, expiresAt: session.expiresAt } : null;
  },
});

export const revokeSession = internalMutation({
  args: { tokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db.query("authSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
    if (session) await ctx.db.patch(session._id, { expiresAt: 0 });
    return null;
  },
});

export const expireSession = internalMutation({
  args: { sessionId: v.id("authSessions") },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (session && session.expiresAt <= Date.now()) await ctx.db.delete(sessionId);
    return null;
  },
});
