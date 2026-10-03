import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const turnValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export default defineSchema({
  phoneSessions: defineTable({
    phone: v.string(),
    turns: v.array(turnValidator),
    lastActiveAt: v.number(),
    recentReplyTimes: v.array(v.number()),
  }).index("by_phone", ["phone"]),
});
