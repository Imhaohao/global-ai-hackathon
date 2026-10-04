import { v } from "convex/values";
import {
  ALERT_AREAS,
  alertAreaById,
  alertCommandReply,
  alertSmsBody,
  draftAlertMessage,
  farmsReportingRecently,
  isAlertableCondition,
  nextSuggestionStep,
  OUTBREAK_WINDOW_MS,
  parseAlertCommand,
  REPORT_RETENTION_MS,
  type AlertableCondition,
  type AlertArea,
} from "../../shared/src/neighbourAlerts.ts";
import { DISEASES, formatOutgoingSms } from "../../shared/src/index.ts";
import { maskPhone } from "../src/app.ts";
import { sendTwilioSms } from "../src/twilio.ts";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { alertChannelValidator, reportSourceValidator } from "./schema";
import { requireEnv } from "./sms";

type AlertChannel = Doc<"alertSubscriptions">["channel"];

const MAX_AREA_SUBSCRIBERS = 5000;
const MAX_RECENT_REPORTS = 1000;
const PRUNE_BATCH_SIZE = 100;
const HUB_CLAIM_BATCH_SIZE = 20;
const HUB_CLAIM_EXPIRY_MS = 10 * 60 * 1000;
const RECENT_SENT_SHOWN = 10;

function subscriptionFor(ctx: QueryCtx | MutationCtx, phone: string, channel: AlertChannel) {
  return ctx.db
    .query("alertSubscriptions")
    .withIndex("by_phone_channel", (q) => q.eq("phone", phone).eq("channel", channel))
    .unique();
}

async function deleteReportsOf(ctx: MutationCtx, subscriptionId: Id<"alertSubscriptions">) {
  const reports = await ctx.db
    .query("diseaseReports")
    .withIndex("by_subscription", (q) => q.eq("subscriptionId", subscriptionId))
    .collect();
  for (const report of reports) await ctx.db.delete(report._id);
}

async function removeSubscription(ctx: MutationCtx, phone: string, channel: AlertChannel) {
  const subscription = await subscriptionFor(ctx, phone, channel);
  if (!subscription) return;
  await deleteReportsOf(ctx, subscription._id);
  await ctx.db.delete(subscription._id);
}

async function joinArea(ctx: MutationCtx, phone: string, channel: AlertChannel, area: AlertArea) {
  const subscription = await subscriptionFor(ctx, phone, channel);
  if (!subscription) {
    await ctx.db.insert("alertSubscriptions", { phone, channel, areaId: area.id, joinedAt: Date.now() });
    return;
  }
  if (subscription.areaId === area.id) return;
  await deleteReportsOf(ctx, subscription._id);
  await ctx.db.patch(subscription._id, { areaId: area.id, joinedAt: Date.now() });
}

export const handleCommand = internalMutation({
  args: { phone: v.string(), channel: alertChannelValidator, text: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { phone, channel, text }) => {
    const command = parseAlertCommand(text);
    if (!command) return null;
    if (command.kind === "join") await joinArea(ctx, phone, channel, command.area);
    if (command.kind === "leave") await removeSubscription(ctx, phone, channel);
    return alertCommandReply(command);
  },
});

export const leave = internalMutation({
  args: { phone: v.string(), channel: alertChannelValidator },
  returns: v.null(),
  handler: async (ctx, { phone, channel }) => {
    await removeSubscription(ctx, phone, channel);
    return null;
  },
});

export const deleteExpiredReports = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("diseaseReports")
      .withIndex("by_reported", (q) => q.lt("reportedAt", Date.now() - REPORT_RETENTION_MS))
      .take(PRUNE_BATCH_SIZE);
    for (const report of expired) await ctx.db.delete(report._id);
    if (expired.length === PRUNE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.neighbourAlerts.deleteExpiredReports, {});
    }
    return expired.length;
  },
});

function recentReports(ctx: MutationCtx, areaId: string, condition: string, now: number) {
  return ctx.db
    .query("diseaseReports")
    .withIndex("by_area_condition", (q) =>
      q.eq("areaId", areaId).eq("condition", condition).gte("reportedAt", now - OUTBREAK_WINDOW_MS),
    )
    .take(MAX_RECENT_REPORTS);
}

function latestAlert(ctx: QueryCtx | MutationCtx, areaId: string, condition: string) {
  return ctx.db
    .query("diseaseAlerts")
    .withIndex("by_area_condition", (q) => q.eq("areaId", areaId).eq("condition", condition))
    .order("desc")
    .first();
}

function farmCounts(reports: Doc<"diseaseReports">[], now: number) {
  const asAreaReports = (list: Doc<"diseaseReports">[]) =>
    list.map((report) => ({ farmerId: report.subscriptionId, reportedAt: report.reportedAt }));
  return {
    farmCount: farmsReportingRecently(asAreaReports(reports), now),
    photoFarmCount: farmsReportingRecently(asAreaReports(reports.filter((report) => report.source === "photo")), now),
  };
}

async function refreshSuggestion(ctx: MutationCtx, area: AlertArea, condition: AlertableCondition, now: number) {
  const counts = farmCounts(await recentReports(ctx, area.id, condition, now), now);
  const latest = await latestAlert(ctx, area.id, condition);
  const step = nextSuggestionStep(counts.farmCount, latest, now);
  const draft = draftAlertMessage(area, condition, counts.farmCount);
  if (step === "create") {
    await ctx.db.insert("diseaseAlerts", {
      areaId: area.id,
      condition,
      ...counts,
      status: "suggested",
      draft,
      suggestedAt: now,
      updatedAt: now,
    });
  }
  if (step === "update" && latest) await ctx.db.patch(latest._id, { ...counts, draft, updatedAt: now });
}

export const recordReport = internalMutation({
  args: { phone: v.string(), channel: alertChannelValidator, condition: v.string(), source: reportSourceValidator },
  returns: v.null(),
  handler: async (ctx, { phone, channel, condition, source }) => {
    if (!isAlertableCondition(condition)) return null;
    const subscription = await subscriptionFor(ctx, phone, channel);
    const area = subscription ? alertAreaById(subscription.areaId) : null;
    if (!subscription || !area) return null;
    const now = Date.now();
    await ctx.db.insert("diseaseReports", { subscriptionId: subscription._id, areaId: area.id, condition, source, reportedAt: now });
    await refreshSuggestion(ctx, area, condition, now);
    return null;
  },
});

async function subscribersIn(ctx: QueryCtx | MutationCtx, areaId: string) {
  return ctx.db
    .query("alertSubscriptions")
    .withIndex("by_area", (q) => q.eq("areaId", areaId))
    .take(MAX_AREA_SUBSCRIBERS);
}

function describeAlert(alert: Doc<"diseaseAlerts">) {
  return {
    id: alert._id,
    areaName: alertAreaById(alert.areaId)?.name ?? alert.areaId,
    conditionName: isAlertableCondition(alert.condition) ? DISEASES[alert.condition].name : alert.condition,
    farmCount: alert.farmCount,
    photoFarmCount: alert.photoFarmCount,
    draft: alert.draft,
    suggestedAt: alert.suggestedAt,
    updatedAt: alert.updatedAt,
    decidedAt: alert.decidedAt ?? null,
    sentBody: alert.sentBody ?? null,
    recipientCount: alert.recipientCount ?? null,
  };
}

const officerAlertValidator = v.object({
  id: v.id("diseaseAlerts"),
  areaName: v.string(),
  conditionName: v.string(),
  farmCount: v.number(),
  photoFarmCount: v.number(),
  draft: v.string(),
  suggestedAt: v.number(),
  updatedAt: v.number(),
  decidedAt: v.union(v.number(), v.null()),
  sentBody: v.union(v.string(), v.null()),
  recipientCount: v.union(v.number(), v.null()),
});

export const officerView = internalQuery({
  args: {},
  returns: v.object({
    suggested: v.array(v.object({ alert: officerAlertValidator, subscriberCount: v.number() })),
    sent: v.array(officerAlertValidator),
    areas: v.array(v.object({ name: v.string(), subscriberCount: v.number() })),
  }),
  handler: async (ctx) => {
    const suggestedAlerts = await ctx.db
      .query("diseaseAlerts")
      .withIndex("by_status", (q) => q.eq("status", "suggested"))
      .order("desc")
      .collect();
    const sentAlerts = await ctx.db
      .query("diseaseAlerts")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .order("desc")
      .take(RECENT_SENT_SHOWN);
    const areas = await Promise.all(
      ALERT_AREAS.map(async (area) => ({ name: area.name, subscriberCount: (await subscribersIn(ctx, area.id)).length })),
    );
    const suggested = await Promise.all(
      suggestedAlerts.map(async (alert) => ({
        alert: describeAlert(alert),
        subscriberCount: (await subscribersIn(ctx, alert.areaId)).length,
      })),
    );
    return { suggested, sent: sentAlerts.map(describeAlert), areas };
  },
});

async function suggestedAlert(ctx: MutationCtx, alertId: string) {
  const id = ctx.db.normalizeId("diseaseAlerts", alertId);
  const alert = id ? await ctx.db.get(id) : null;
  return alert?.status === "suggested" ? alert : null;
}

export const approve = internalMutation({
  args: { alertId: v.string(), text: v.string() },
  returns: v.union(v.object({ recipientCount: v.number() }), v.null()),
  handler: async (ctx, { alertId, text }) => {
    const alert = await suggestedAlert(ctx, alertId);
    if (!alert || !text.trim()) return null;
    const body = alertSmsBody(text);
    const subscribers = await subscribersIn(ctx, alert.areaId);
    for (const subscriber of subscribers) {
      await ctx.db.insert("alertDeliveries", { alertId: alert._id, phone: subscriber.phone, channel: subscriber.channel, body, status: "queued" });
    }
    await ctx.db.patch(alert._id, { status: "sent", decidedAt: Date.now(), sentBody: body, recipientCount: subscribers.length });
    if (subscribers.some((subscriber) => subscriber.channel === "twilio")) {
      await ctx.scheduler.runAfter(0, internal.neighbourAlerts.sendTwilioAlerts, { alertId: alert._id });
    }
    return { recipientCount: subscribers.length };
  },
});

export const dismiss = internalMutation({
  args: { alertId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { alertId }) => {
    const alert = await suggestedAlert(ctx, alertId);
    if (!alert) return false;
    await ctx.db.patch(alert._id, { status: "dismissed", decidedAt: Date.now() });
    return true;
  },
});

export const queuedTwilioDeliveries = internalQuery({
  args: { alertId: v.id("diseaseAlerts") },
  returns: v.array(v.object({ id: v.id("alertDeliveries"), phone: v.string(), body: v.string() })),
  handler: async (ctx, { alertId }) => {
    const deliveries = await ctx.db
      .query("alertDeliveries")
      .withIndex("by_alert_channel_status", (q) => q.eq("alertId", alertId).eq("channel", "twilio").eq("status", "queued"))
      .collect();
    return deliveries.map((delivery) => ({ id: delivery._id, phone: delivery.phone, body: delivery.body }));
  },
});

export const finishTwilioDelivery = internalMutation({
  args: { deliveryId: v.id("alertDeliveries"), sent: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { deliveryId, sent }) => {
    await ctx.db.patch(deliveryId, { status: sent ? "sent" : "failed" });
    return null;
  },
});

export const sendTwilioAlerts = internalAction({
  args: { alertId: v.id("diseaseAlerts") },
  returns: v.null(),
  handler: async (ctx, { alertId }) => {
    const credentials = {
      accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
      authToken: requireEnv("TWILIO_AUTH_TOKEN"),
      fromNumber: requireEnv("TWILIO_PHONE_NUMBER"),
    };
    const deliveries = await ctx.runQuery(internal.neighbourAlerts.queuedTwilioDeliveries, { alertId });
    for (const delivery of deliveries) {
      const sent = await sendTwilioSms(credentials, delivery.phone, formatOutgoingSms(delivery.body, false))
        .then(() => true)
        .catch((error: unknown) => {
          console.error(`Could not send alert to ${maskPhone(delivery.phone)}:`, error);
          return false;
        });
      await ctx.runMutation(internal.neighbourAlerts.finishTwilioDelivery, { deliveryId: delivery.id, sent });
    }
    return null;
  },
});

async function claimableHubDeliveries(ctx: MutationCtx, now: number) {
  const queued = await ctx.db
    .query("alertDeliveries")
    .withIndex("by_channel_status", (q) => q.eq("channel", "hub").eq("status", "queued"))
    .take(HUB_CLAIM_BATCH_SIZE);
  const claimed = await ctx.db
    .query("alertDeliveries")
    .withIndex("by_channel_status", (q) => q.eq("channel", "hub").eq("status", "claimed"))
    .take(HUB_CLAIM_BATCH_SIZE);
  const abandoned = claimed.filter((delivery) => now - (delivery.claimedAt ?? 0) > HUB_CLAIM_EXPIRY_MS);
  return [...queued, ...abandoned].slice(0, HUB_CLAIM_BATCH_SIZE);
}

export const claimHubDeliveries = internalMutation({
  args: {},
  returns: v.array(v.object({ id: v.id("alertDeliveries"), phone: v.string(), body: v.string() })),
  handler: async (ctx) => {
    const now = Date.now();
    const deliveries = await claimableHubDeliveries(ctx, now);
    for (const delivery of deliveries) await ctx.db.patch(delivery._id, { status: "claimed", claimedAt: now });
    return deliveries.map((delivery) => ({ id: delivery._id, phone: delivery.phone, body: delivery.body }));
  },
});

export const finishHubDelivery = internalMutation({
  args: { deliveryId: v.string(), sent: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, { deliveryId, sent }) => {
    const id = ctx.db.normalizeId("alertDeliveries", deliveryId);
    const delivery = id ? await ctx.db.get(id) : null;
    if (!delivery || delivery.channel !== "hub" || delivery.status !== "claimed") return false;
    await ctx.db.patch(delivery._id, { status: sent ? "sent" : "failed" });
    return true;
  },
});
