import assert from "node:assert/strict";
import { test } from "node:test";

import type { LocalModel } from "../../shared/src/localModel/index.ts";
import { answerQuestion } from "./answerQuestion.ts";

const swahiliRust: LocalModel = {
  modelId: "fake",
  async complete() {
    return JSON.stringify({
      language: "sw",
      topic: "leaf_symptoms",
      symptomsInEnglish: "orange powder underneath, leaves falling",
      sprayProduct: "not_mentioned",
      sprayedWhen: "not_mentioned",
      rainAfterSpraying: "not_mentioned",
    });
  },
};

test("offline with the model loaded: Swahili confirm-first reply plus the model's reading", async () => {
  delete process.env.EXPO_PUBLIC_BACKEND_URL;
  const answer = await answerQuestion("+254700000000", "majani yana kitu chini", swahiliRust);
  assert.equal(answer.source, "offline");
  assert.match(answer.reply, /^Huenda ni Kutu/);
  assert.equal(answer.modelReading?.symptomsInEnglish, "orange powder underneath, leaves falling");
});

test("offline without a model: the keyword matcher answers as before", async () => {
  delete process.env.EXPO_PUBLIC_BACKEND_URL;
  const answer = await answerQuestion("+254700000000", "orange powder under my leaves", null);
  assert.match(answer.reply, /^This sounds like Coffee leaf rust/);
  assert.equal(answer.modelReading, null);
});
