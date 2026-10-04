import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const turnValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export default defineSchema({
  accounts: defineTable({
    phone: v.string(),
  }).index("by_phone", ["phone"]),
  authSessions: defineTable({
    accountId: v.id("accounts"),
    tokenHash: v.string(),
    verificationSid: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["tokenHash"]).index("by_verification", ["verificationSid"]),
  authAttempts: defineTable({
    key: v.string(),
    times: v.array(v.number()),
  }).index("by_key", ["key"]),
  phoneSessions: defineTable({
    phone: v.string(),
    turns: v.array(turnValidator),
    lastActiveAt: v.number(),
    recentReplyTimes: v.array(v.number()),
  }).index("by_phone", ["phone"]),
});
