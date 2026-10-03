import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import type { LocalModel } from "../../shared/src/localModel/index.ts";
import { answerQuestion } from "./answerQuestion.ts";
import { DEFAULT_BACKEND_URL } from "./backendUrl.ts";

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
    const answer = await answerQuestion("+254700000000", "majani yana kitu chini", swahiliRust, null);
  assert.equal(answer.source, "offline");
  assert.match(answer.reply, /^Huenda ni Kutu/);
  assert.equal(answer.modelReading?.symptomsInEnglish, "orange powder underneath, leaves falling");
});

test("offline without a model: the keyword matcher answers as before", async () => {
    const answer = await answerQuestion("+254700000000", "orange powder under my leaves", null, null);
  assert.match(answer.reply, /^This sounds like Coffee leaf rust/);
  assert.equal(answer.modelReading, null);
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(respond: () => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  return calls;
}

test("no saved token: never calls fetch and answers offline", async () => {
  const calls = stubFetch(() => {
    throw new Error("fetch must not be called");
  });
  const answer = await answerQuestion("+254700000000", "orange powder under my leaves", null, null);
  assert.equal(calls.length, 0);
  assert.equal(answer.source, "offline");
});

test("saved token: asks the default backend with a bearer header", async () => {
  const calls = stubFetch(() => Response.json({ reply: "from the server" }));
  const answer = await answerQuestion("+254700000000", "leaves", null, "test-not-real");
  assert.equal(calls[0].url, `${DEFAULT_BACKEND_URL}/ask`);
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-not-real");
  assert.deepEqual([answer.source, answer.reply], ["online", "from the server"]);
});

test("backend rejects the token: falls back offline", async () => {
  stubFetch(() => new Response("nope", { status: 401 }));
  const answer = await answerQuestion("+254700000000", "orange powder under my leaves", null, "test-not-real");
  assert.equal(answer.source, "offline");
});
