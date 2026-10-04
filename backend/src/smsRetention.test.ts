import assert from "node:assert/strict";
import { test } from "node:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema.ts";
import { internal } from "../convex/_generated/api.js";
import { IDLE_RESET_MS } from "./conversationStore.ts";

const modules = {
  "./phoneSessions.ts": () => import("../convex/phoneSessions.ts"),
  "./_generated/server.js": () => import("../convex/_generated/server.js"),
};

test("idle SMS cleanup deletes bounded batches and schedules the remaining rows", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const db = convexTest(schema, modules);
  const now = Date.now();
  await db.run(async (ctx) => {
    for (let index = 0; index < 205; index += 1) {
      await ctx.db.insert("phoneSessions", {
        phone: `old-${index}`, turns: [], recentReplyTimes: [], lastActiveAt: now - IDLE_RESET_MS - 60_000,
      });
    }
    await ctx.db.insert("phoneSessions", { phone: "active", turns: [], recentReplyTimes: [], lastActiveAt: now });
  });
  assert.equal(await db.mutation(internal.phoneSessions.deleteIdleSessions, {}), 100);
  assert.equal((await db.run((ctx) => ctx.db.query("phoneSessions").collect())).length, 106);
  await db.finishAllScheduledFunctions(() => context.mock.timers.runAll());
  const remaining = await db.run((ctx) => ctx.db.query("phoneSessions").collect());
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].phone, "active");
});
