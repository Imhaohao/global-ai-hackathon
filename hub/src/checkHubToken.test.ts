import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkHubToken } from "./checkHubToken.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function fakeFetch(respond: (init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond(init ?? {});
  }) as typeof fetch;
  return calls;
}

test("204 means the token is valid, and the check posts to /hub/check with the bearer header", async () => {
  const calls = fakeFetch(() => new Response(null, { status: 204 }));
  assert.equal(await checkHubToken("https://example.test", "test-not-real"), "valid");
  assert.equal(calls[0].url, "https://example.test/hub/check");
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-not-real");
});

test("401 means the token was rejected", async () => {
  fakeFetch(() => new Response("no", { status: 401 }));
  assert.equal(await checkHubToken("https://example.test", "x"), "rejected");
});

test("503 and other statuses mean unreachable", async () => {
  for (const status of [503, 500, 200, 404]) {
    fakeFetch(() => new Response("", { status }));
    assert.equal(await checkHubToken("https://example.test", "x"), "unreachable");
  }
});

test("a network error means unreachable", async () => {
  fakeFetch(() => {
    throw new TypeError("Network request failed");
  });
  assert.equal(await checkHubToken("https://example.test", "x"), "unreachable");
});

test("a request that never answers is aborted and reported unreachable", async () => {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((handler: () => void) => realSetTimeout(handler, 5)) as typeof setTimeout;
  try {
    fakeFetch(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    assert.equal(await checkHubToken("https://example.test", "x"), "unreachable");
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});
