import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema.ts";
import { internal } from "../convex/_generated/api.js";
import { createAlertRoutes, type NeighbourAlertService } from "./alertRoutes.ts";

const modules = {
  "./neighbourAlerts.ts": () => import("../convex/neighbourAlerts.ts"),
  "./_generated/server.js": () => import("../convex/_generated/server.js"),
  "./_generated/api.js": () => import("../convex/_generated/api.js"),
};

function backend(context: TestContext) {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  return convexTest(schema, modules);
}

type Backend = ReturnType<typeof backend>;
const FARMERS = ["+254700000001", "+254700000002", "+254700000003", "+254700000004"];

async function join(db: Backend, phone: string, area: string, channel: "hub" | "twilio" = "hub") {
  return db.mutation(internal.neighbourAlerts.handleCommand, { phone, channel, text: `ALERTS ${area}` });
}

function report(db: Backend, phone: string, condition: string, source: "photo" | "text" = "text") {
  return db.mutation(internal.neighbourAlerts.recordReport, { phone, channel: "hub", condition, source });
}

test("a third farm reporting rust in one area drafts an alert, and repeats from one farm do not count", async (context) => {
  const db = backend(context);
  for (const phone of FARMERS.slice(0, 3)) assert.match((await join(db, phone, "Karima")) ?? "", /farms in Karima/);

  await report(db, FARMERS[0], "rust", "photo");
  await report(db, FARMERS[0], "rust", "photo");
  await report(db, FARMERS[1], "rust");
  assert.equal((await db.query(internal.neighbourAlerts.officerView, {})).suggested.length, 0);

  await report(db, FARMERS[2], "rust");
  const [waiting] = (await db.query(internal.neighbourAlerts.officerView, {})).suggested;
  assert.equal(waiting.alert.areaName, "Karima");
  assert.equal(waiting.alert.conditionName, "Coffee leaf rust");
  assert.equal(waiting.alert.farmCount, 3);
  assert.equal(waiting.alert.photoFarmCount, 1);
  assert.equal(waiting.subscriberCount, 3);
  assert.match(waiting.alert.draft, /^Leaf alert for Karima: 3 farms/);
});

test("reports from farmers who never joined, healthy leaves and possible-only pests are ignored", async (context) => {
  const db = backend(context);
  for (const phone of FARMERS.slice(0, 3)) await join(db, phone, "Mahiga");
  await report(db, "+254799999999", "rust");
  for (const phone of FARMERS.slice(0, 3)) {
    await report(db, phone, "healthy");
    await report(db, phone, "mites");
  }
  assert.equal(await db.run((ctx) => ctx.db.query("diseaseReports").collect().then((rows) => rows.length)), 0);
});

test("approving queues one text per farmer in that area only, and the bridge claims hub texts once", async (context) => {
  const db = backend(context);
  for (const phone of FARMERS.slice(0, 3)) await join(db, phone, "Karima");
  await join(db, FARMERS[3], "Chinga");
  for (const phone of FARMERS.slice(0, 3)) await report(db, phone, "rust");
  const [waiting] = (await db.query(internal.neighbourAlerts.officerView, {})).suggested;

  const sent = await db.mutation(internal.neighbourAlerts.approve, { alertId: waiting.alert.id, text: "Rust near you. Check under the leaves." });
  assert.deepEqual(sent, { recipientCount: 3 });
  assert.equal(await db.mutation(internal.neighbourAlerts.approve, { alertId: waiting.alert.id, text: "again" }), null);

  const claimed = await db.mutation(internal.neighbourAlerts.claimHubDeliveries, {});
  assert.deepEqual(claimed.map((delivery) => delivery.phone).sort(), FARMERS.slice(0, 3));
  assert.match(claimed[0].body, /Check under the leaves\.\nText ALERTS OFF to stop these alerts\.$/);
  assert.equal((await db.mutation(internal.neighbourAlerts.claimHubDeliveries, {})).length, 0);

  assert.equal(await db.mutation(internal.neighbourAlerts.finishHubDelivery, { deliveryId: claimed[0].id, sent: true }), true);
  assert.equal(await db.mutation(internal.neighbourAlerts.finishHubDelivery, { deliveryId: claimed[0].id, sent: true }), false);
  assert.equal(await db.mutation(internal.neighbourAlerts.finishHubDelivery, { deliveryId: "not-an-id", sent: true }), false);
});

test("after an alert is sent, more reports that week do not draft a second one", async (context) => {
  const db = backend(context);
  for (const phone of FARMERS) await join(db, phone, "Karima");
  for (const phone of FARMERS.slice(0, 3)) await report(db, phone, "rust");
  const [waiting] = (await db.query(internal.neighbourAlerts.officerView, {})).suggested;
  await db.mutation(internal.neighbourAlerts.dismiss, { alertId: waiting.alert.id });
  await report(db, FARMERS[3], "rust");
  assert.equal((await db.query(internal.neighbourAlerts.officerView, {})).suggested.length, 0);
});

test("leaving, STOP, or moving area deletes that farmer's reports", async (context) => {
  const db = backend(context);
  await join(db, FARMERS[0], "Karima");
  await join(db, FARMERS[1], "Karima");
  await report(db, FARMERS[0], "rust");
  await report(db, FARMERS[1], "rust");

  assert.match((await db.mutation(internal.neighbourAlerts.handleCommand, { phone: FARMERS[0], channel: "hub", text: "alerts off" })) ?? "", /not get area alerts/);
  await join(db, FARMERS[1], "Chinga");
  assert.equal(await db.run((ctx) => ctx.db.query("diseaseReports").collect().then((rows) => rows.length)), 0);

  await db.mutation(internal.neighbourAlerts.leave, { phone: FARMERS[1], channel: "hub" });
  const areas = (await db.query(internal.neighbourAlerts.officerView, {})).areas;
  assert.ok(areas.every((area) => area.subscriberCount === 0));
});

test("reports older than 14 days are deleted and newer ones are kept", async (context) => {
  const db = backend(context);
  await join(db, FARMERS[0], "Karima");
  await report(db, FARMERS[0], "rust");
  await db.run(async (ctx) => {
    const [fresh] = await ctx.db.query("diseaseReports").collect();
    await ctx.db.insert("diseaseReports", { ...fresh, _id: undefined, _creationTime: undefined, reportedAt: Date.now() - 15 * 24 * 60 * 60 * 1000 } as never);
  });
  assert.equal(await db.mutation(internal.neighbourAlerts.deleteExpiredReports, {}), 1);
  assert.equal(await db.run((ctx) => ctx.db.query("diseaseReports").collect().then((rows) => rows.length)), 1);
});

test("non-commands pass through to the advisor", async (context) => {
  const db = backend(context);
  assert.equal(await db.mutation(internal.neighbourAlerts.handleCommand, { phone: FARMERS[0], channel: "hub", text: "orange powder" }), null);
});

const HUB_TOKEN = "test-hub-token";

function routes(overrides: Partial<NeighbourAlertService> = {}) {
  const calls: string[] = [];
  const alerts: NeighbourAlertService = {
    officerView: async () => ({ suggested: [], sent: [], areas: [] }),
    approve: async (id, text) => (calls.push(`approve ${id} ${text}`), { recipientCount: 2 }),
    dismiss: async (id) => (calls.push(`dismiss ${id}`), true),
    claimHubDeliveries: async () => [{ id: "d1", phone: "+1", body: "hi" }],
    finishHubDelivery: async (id, sent) => (calls.push(`finish ${id} ${sent}`), true),
    leave: async (phone, channel) => void calls.push(`leave ${phone} ${channel}`),
    ...overrides,
  };
  const app = createAlertRoutes(alerts, (authorization) =>
    authorization === `Bearer ${HUB_TOKEN}` ? null : { error: "Unauthorized", status: 401 },
  );
  const post = (path: string, body: unknown, token = HUB_TOKEN) =>
    app.request(path, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { app, post, calls };
}

test("the officer page loads without a token but its data and actions need the hub token", async () => {
  const { app, post, calls } = routes();
  const page = await app.request("/officer");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Area alerts/);
  assert.equal((await app.request("/officer/alerts")).status, 401);
  assert.equal((await post("/officer/send", { id: "a1", text: "hi" }, "wrong")).status, 401);
  assert.equal((await post("/hub/alerts/claim", {}, "wrong")).status, 401);
  assert.deepEqual(calls, []);
});

test("officer send and dismiss validate input and report an alert that was already decided", async () => {
  const { post, calls } = routes({ approve: async () => null, dismiss: async () => false });
  assert.equal((await post("/officer/send", { id: "a1", text: "   " })).status, 400);
  assert.equal((await post("/officer/send", { id: "a1", text: "Rust near you" })).status, 409);
  assert.equal((await post("/officer/dismiss", { id: "a1" })).status, 409);
  assert.deepEqual(calls, []);
});

test("the bridge claims texts, reports each one, and can unsubscribe a farmer who said STOP", async () => {
  const { post, calls } = routes();
  assert.deepEqual(await (await post("/hub/alerts/claim", {})).json(), { deliveries: [{ id: "d1", phone: "+1", body: "hi" }] });
  assert.equal((await post("/hub/alerts/done", { id: "d1", sent: "yes" })).status, 400);
  assert.equal((await post("/hub/alerts/done", { id: "d1", sent: false })).status, 204);
  assert.equal((await post("/hub/alerts/leave", { from: "+1" })).status, 204);
  assert.deepEqual(calls, ["finish d1 false", "leave +1 hub"]);
});
