import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createReplyGuard, evaluateReply, isBlank, MAX_REPLIES_PER_WINDOW, WINDOW_MS } from "./replyGuard.ts";

describe("evaluateReply", () => {
  it("allows the first five replies and blocks the sixth", () => {
    let times: number[] = [];
    for (let i = 0; i < MAX_REPLIES_PER_WINDOW; i++) {
      const decision = evaluateReply(times, 1000 + i);
      assert.equal(decision.allowed, true);
      times = decision.recentReplyTimes;
    }
    const sixth = evaluateReply(times, 2000);
    assert.equal(sixth.allowed, false);
    assert.equal(sixth.recentReplyTimes.length, MAX_REPLIES_PER_WINDOW);
  });

  it("allows again once old replies leave the window", () => {
    const times = [0, 1, 2, 3, 4];
    assert.equal(evaluateReply(times, WINDOW_MS - 1).allowed, false);
    assert.equal(evaluateReply(times, WINDOW_MS + 2).allowed, true);
  });

  it("does not record blocked attempts", () => {
    const times = [10, 20, 30, 40, 50];
    assert.deepEqual(evaluateReply(times, 100).recentReplyTimes, times);
  });
});

describe("createReplyGuard", () => {
  it("tracks each sender separately", () => {
    const shouldReply = createReplyGuard(1, 1000);
    assert.equal(shouldReply("a", "hi", 0), true);
    assert.equal(shouldReply("a", "hi", 1), false);
    assert.equal(shouldReply("b", "hi", 1), true);
  });

  it("ignores blank bodies without using up the allowance", () => {
    const shouldReply = createReplyGuard(1, 1000);
    assert.equal(shouldReply("a", "   ", 0), false);
    assert.equal(shouldReply("a", "hi", 1), true);
  });

  it("detects blank text", () => {
    assert.equal(isBlank(" \n\t"), true);
    assert.equal(isBlank("rust"), false);
  });
});
