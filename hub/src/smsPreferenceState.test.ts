import assert from "node:assert/strict";
import { test } from "node:test";

import { createSmsPreferenceState, isOptedOutSender, normalizeSmsSender, updateOptedOutSenders } from "./smsPreferenceState";

test("STOP persists a normalized sender and START removes only that sender", () => {
  const original = new Set(["+254700000001"]);
  const stopped = updateOptedOutSenders(original, " +254700000002 ", true);
  assert.equal(isOptedOutSender(stopped, "+254700000002"), true);
  assert.equal(isOptedOutSender(stopped, "+254700000001"), true);
  const resumed = updateOptedOutSenders(stopped, "+254700000002", false);
  assert.equal(isOptedOutSender(resumed, "+254700000002"), false);
  assert.equal(isOptedOutSender(resumed, "+254700000001"), true);
  assert.equal(normalizeSmsSender("  +254700000003  "), "+254700000003");
  assert.equal(original.has("+254700000002"), false);
});

test("STOP blocks immediately and an earlier pending START cannot undo it", async () => {
  let stored = new Set(["+1"]);
  let finishStart!: () => void;
  let writes = 0;
  const state = createSmsPreferenceState({
    loadOptedOutSenders: async () => stored,
    saveOptedOutSenders: async (next) => {
      if (++writes === 1) await new Promise<void>((resolve) => { finishStart = resolve; });
      stored = new Set(next);
    },
  });
  assert.equal(await state.load(), true);
  const start = state.setOptedOut("+1", false);
  await Promise.resolve();
  const stop = state.setOptedOut("+1", true);
  assert.equal(state.isBlocked("+1"), true);
  finishStart();
  assert.equal(await start, true);
  assert.equal(state.isBlocked("+1"), true);
  assert.equal(await stop, true);
  assert.equal(stored.has("+1"), true);
});

test("failed preference storage keeps STOP blocked and suspends other advice", async () => {
  const state = createSmsPreferenceState({
    loadOptedOutSenders: async () => new Set(),
    saveOptedOutSenders: async () => { throw new Error("secure storage unavailable"); },
  });
  await state.load();
  const stop = state.setOptedOut("+1", true);
  assert.equal(state.isBlocked("+1"), true);
  assert.equal(await stop, false);
  assert.equal(state.isBlocked("+1"), true);
  assert.equal(state.isBlocked("+2"), true);
  assert.equal(await state.setOptedOut("+1", false), false);
  assert.equal(await state.load(), false);
});

test("a storage load failure never permits replies", async () => {
  const state = createSmsPreferenceState({
    loadOptedOutSenders: async () => { throw new Error("invalid stored preferences"); },
    saveOptedOutSenders: async () => {},
  });
  assert.equal(state.isBlocked("+1"), true);
  assert.equal(await state.load(), false);
  assert.equal(state.isBlocked("+1"), true);
});

test("confirmed STOP and START survive a fresh preference-state instance", async () => {
  let saved = new Set<string>();
  const preferences = {
    loadOptedOutSenders: async () => new Set(saved),
    saveOptedOutSenders: async (next: Set<string>) => { saved = new Set(next); },
  };
  const firstRun = createSmsPreferenceState(preferences);
  await firstRun.load();
  assert.equal(await firstRun.setOptedOut("+1", true), true);
  const restarted = createSmsPreferenceState(preferences);
  await restarted.load();
  assert.equal(restarted.isBlocked("+1"), true);
  assert.equal(restarted.isBlocked("+2"), false);
  assert.equal(await restarted.setOptedOut("+1", false), true);
  const resumed = createSmsPreferenceState(preferences);
  await resumed.load();
  assert.equal(resumed.isBlocked("+1"), false);
});
