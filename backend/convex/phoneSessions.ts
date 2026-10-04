import { v } from "convex/values";
import { evaluateReply } from "../../shared/src/index.ts";
import { appendExchange, freshTurns, IDLE_RESET_MS } from "../src/conversationStore.ts";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { turnValidator } from "./schema";

const IDLE_CLEANUP_BATCH_SIZE = 100;

function sessionFor(ctx: QueryCtx | MutationCtx, phone: string) {
  return ctx.db
    .query("phoneSessions")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();
}

export const history = internalQuery({
  args: { phone: v.string() },
  returns: v.array(turnValidator),
  handler: async (ctx, { phone }) => {
    const session = await sessionFor(ctx, phone);
    return session ? freshTurns(session.turns, session.lastActiveAt, Date.now()) : [];
  },
});

export const recordExchange = internalMutation({
  args: { phone: v.string(), question: v.string(), answer: v.string() },
  returns: v.null(),
  handler: async (ctx, { phone, question, answer }) => {
    const now = Date.now();
    const session = await sessionFor(ctx, phone);
    const previous = session ? freshTurns(session.turns, session.lastActiveAt, now) : [];
    const turns = appendExchange(previous, question, answer);
    if (session) {
      await ctx.db.patch(session._id, { turns, lastActiveAt: now });
    } else {
      await ctx.db.insert("phoneSessions", { phone, turns, lastActiveAt: now, recentReplyTimes: [] });
    }
    return null;
  },
});

export const claimReplySlot = internalMutation({
  args: { phone: v.string(), maxReplies: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { phone, maxReplies }) => {
    const now = Date.now();
    const session = await sessionFor(ctx, phone);
    const decision = evaluateReply(session?.recentReplyTimes ?? [], now, maxReplies);
    if (session) {
      await ctx.db.patch(session._id, { recentReplyTimes: decision.recentReplyTimes });
    } else {
      await ctx.db.insert("phoneSessions", {
        phone,
        turns: [],
        lastActiveAt: now,
        recentReplyTimes: decision.recentReplyTimes,
      });
    }
    return decision.allowed;
  },
});

export const deleteIdleSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - IDLE_RESET_MS;
    const sessions = await ctx.db
      .query("phoneSessions")
      .withIndex("by_last_active", (q) => q.lt("lastActiveAt", cutoff))
      .take(IDLE_CLEANUP_BATCH_SIZE);
    let deleted = 0;
    for (const session of sessions) {
      await ctx.db.delete(session._id);
      deleted += 1;
    }
    if (sessions.length === IDLE_CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.phoneSessions.deleteIdleSessions, {});
    }
    return deleted;
  },
});
