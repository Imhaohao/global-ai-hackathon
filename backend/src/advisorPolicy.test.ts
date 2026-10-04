import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";

import { createClaudeAdvisor, parseAdvisorReport } from "./advisor.ts";
import { InMemoryConversationHistory } from "./conversationStore.ts";
import { createPhotoAdvisor } from "./photoAdvisor.ts";

function fakeClient(text: string): Anthropic {
  return {
    beta: {
      messages: {
        create: async () => ({
          stop_reason: "end_turn",
          content: [{ type: "text", text }],
        }),
      },
    },
  } as unknown as Anthropic;
}

const report = {
  language: "en",
  topic: "leaf_symptoms",
  symptomsInEnglish: "orange powder underneath",
  sprayProduct: "not_mentioned",
  sprayedWhen: "not_mentioned",
  rainAfterSpraying: "not_mentioned",
};

test("the online advisor parses model output and constructs the safe action reply", async () => {
  const generated = JSON.stringify({ ...report, reply: "Spray 50 ml of product immediately." });
  const advisor = createClaudeAdvisor(() => fakeClient(generated), new InMemoryConversationHistory());
  const reply = await advisor.advise("+1", "orange powder under my leaves");
  assert.match(reply, /Twilio, Convex and Anthropic process your messages and photos/);
  assert.match(reply, /Coffee leaf rust/);
  assert.match(reply, /Decision: prune and clean up/);
  assert.doesNotMatch(reply, /50 ml|immediately/);
  const followUp = await advisor.advise("+1", "the spots are still there");
  assert.doesNotMatch(followUp, /Twilio, Convex and Anthropic process your messages and photos/);
});

test("malformed online output falls back to the shared rule reply", async () => {
  const advisor = createClaudeAdvisor(() => fakeClient("Spray 50 ml of product immediately."), new InMemoryConversationHistory());
  const reply = await advisor.advise("+1", "orange powder under my leaves");
  assert.match(reply, /Coffee leaf rust/);
  assert.doesNotMatch(reply, /50 ml/);
});

test("photo recommendations ignore generated prose and use the action card", async () => {
  const generated = JSON.stringify({
    condition: "rust",
    confidence: "confident",
    language: "en",
    reply: "Spray 50 ml of product immediately.",
  });
  const advisor = createPhotoAdvisor(() => fakeClient(generated), new InMemoryConversationHistory());
  const reply = await advisor.advisePhoto("+1", { base64: "aGVsbG8=", mediaType: "image/jpeg", caption: "" });
  assert.match(reply, /Twilio, Convex and Anthropic process your messages and photos/);
  assert.match(reply, /Coffee leaf rust/);
  assert.match(reply, /This might be Coffee leaf rust/);
  assert.doesNotMatch(reply, /Decision:/);
  assert.doesNotMatch(reply, /50 ml|immediately/);
});

test("a photo can be confident only when its raw caption independently matches", async () => {
  const generated = JSON.stringify({ condition: "rust", confidence: "confident", language: "en" });
  const advisor = createPhotoAdvisor(() => fakeClient(generated), new InMemoryConversationHistory());
  const reply = await advisor.advisePhoto("+1", {
    base64: "aGVsbG8=",
    mediaType: "image/jpeg",
    caption: "orange powder under my leaves",
  });
  assert.match(reply, /Decision: prune and clean up/);
});

test("online report parsing rejects arbitrary prose", () => {
  assert.equal(parseAdvisorReport("Spray 50 ml now" ).status, "unsure");
});
