import assert from "node:assert/strict";
import { test } from "node:test";

import { FARMER_MESSAGE_CASES } from "./localModel/evalCases.ts";
import { looksLikeKikuyu } from "./languageGuard.ts";

test("Kikuyu letters alone mark a message as Kikuyu", () => {
  assert.equal(looksLikeKikuyu("mahuti nĩ marũaru"), true);
});

test("two Kikuyu words without special letters mark a message as Kikuyu", () => {
  assert.equal(looksLikeKikuyu("mahuti maria me iguru ni maguthukite muno"), true);
});

test("a single Kikuyu-looking word is not enough", () => {
  assert.equal(looksLikeKikuyu("majani yana madoa muno"), false);
});

test("none of the Swahili and English farmer eval messages look like Kikuyu", () => {
  const flagged = FARMER_MESSAGE_CASES.filter((evalCase) => looksLikeKikuyu(evalCase.message));
  assert.deepEqual(flagged.map((evalCase) => evalCase.message), []);
});
