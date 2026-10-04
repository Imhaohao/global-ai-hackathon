import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const turnValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
});

export const alertChannelValidator = v.union(v.literal("twilio"), v.literal("hub"));
export const alertStatusValidator = v.union(v.literal("suggested"), v.literal("sent"), v.literal("dismissed"));
export const reportSourceValidator = v.union(v.literal("photo"), v.literal("text"));
export const deliveryStatusValidator = v.union(v.literal("queued"), v.literal("claimed"), v.literal("sent"), v.literal("failed"));

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
  alertSubscriptions: defineTable({
    phone: v.string(),
    channel: alertChannelValidator,
    areaId: v.string(),
    joinedAt: v.number(),
  }).index("by_phone_channel", ["phone", "channel"]).index("by_area", ["areaId"]),
  diseaseReports: defineTable({
    subscriptionId: v.id("alertSubscriptions"),
    areaId: v.string(),
    condition: v.string(),
    source: reportSourceValidator,
    reportedAt: v.number(),
  })
    .index("by_area_condition", ["areaId", "condition", "reportedAt"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_reported", ["reportedAt"]),
  diseaseAlerts: defineTable({
    areaId: v.string(),
    condition: v.string(),
    farmCount: v.number(),
    photoFarmCount: v.number(),
    status: alertStatusValidator,
    draft: v.string(),
    suggestedAt: v.number(),
    updatedAt: v.number(),
    decidedAt: v.optional(v.number()),
    sentBody: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
  }).index("by_area_condition", ["areaId", "condition", "suggestedAt"]).index("by_status", ["status", "updatedAt"]),
  alertDeliveries: defineTable({
    alertId: v.id("diseaseAlerts"),
    phone: v.string(),
    channel: alertChannelValidator,
    body: v.string(),
    status: deliveryStatusValidator,
    claimedAt: v.optional(v.number()),
  }).index("by_channel_status", ["channel", "status"]).index("by_alert_channel_status", ["alertId", "channel", "status"]),
});
