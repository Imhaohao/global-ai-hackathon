import assert from "node:assert/strict";
import { test } from "node:test";
import { DISEASES } from "../diseases.ts";
import { matchWithModelHelp } from "./assistedMatch.ts";
import { checkProductLabel } from "./checkProductLabel.ts";
import { buildChatBody, createLlamaServerModel } from "./llamaServerModel.ts";
import type { LocalModel, LocalModelRequest } from "./localModel.ts";
import { activeLocalModel, llamaServerCommand, LOCAL_MODELS, totalDownloadBytes } from "./modelCatalog.ts";
import { parseFarmerMessage, textForSymptomMatcher } from "./parseFarmerMessage.ts";
import type { FarmerReport } from "./parseFarmerMessage.ts";
import { phraseVerdictInSwahili, phrasingProblem } from "./phraseVerdict.ts";
import type { VerdictToPhrase } from "./phraseVerdict.ts";
import type { ProductLabel } from "./readProductLabel.ts";
import { readProductLabel } from "./readProductLabel.ts";

function fakeModel(reply: string | Error): LocalModel & { requests: LocalModelRequest[] } {
  const requests: LocalModelRequest[] = [];
  return {
    modelId: "fake",
    requests,
    async complete(request) {
      requests.push(request);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
}

const sprayReport: FarmerReport = {
  language: "sw",
  topic: "spraying",
  symptomsInEnglish: "",
  sprayProduct: "copper",
  sprayedWhen: "yesterday",
  rainAfterSpraying: "yes",
};

test("a valid model reply becomes a farmer report and asks for JSON", async () => {
  const model = fakeModel(JSON.stringify(sprayReport));
  const result = await parseFarmerMessage(model, "nilinyunyiza dawa ya blue jana, mvua ikanyesha");
  assert.deepEqual(result, { status: "ok", value: sprayReport });
  assert.ok(model.requests[0].outputSchema);
});

test("an out-of-list product makes the parse unsure instead of guessing", async () => {
  const result = await parseFarmerMessage(fakeModel(JSON.stringify({ ...sprayReport, sprayProduct: "magic" })), "x");
  assert.deepEqual(result, { status: "unsure", reason: "model output has an invalid sprayProduct" });
});

test("a crashed or non-JSON model makes the parse unsure", async () => {
  assert.equal((await parseFarmerMessage(fakeModel(new Error("offline")), "x")).status, "unsure");
  assert.equal((await parseFarmerMessage(fakeModel("sorry"), "x")).status, "unsure");
});

test("the symptom matcher keeps the farmer's own words next to the translation", () => {
  const report = { status: "ok" as const, value: { ...sprayReport, symptomsInEnglish: "orange powder underneath" } };
  assert.equal(textForSymptomMatcher("unga chini", report), "unga chini orange powder underneath");
  assert.equal(textForSymptomMatcher("unga chini", { status: "unsure", reason: "x" }), "unga chini");
});

test("the model can never override or finalize a diagnosis on its own", () => {
  const misleading = { status: "ok" as const, value: { ...sprayReport, symptomsInEnglish: "brown spots with a grey center and yellow halo" } };
  const farmerSaidRust = matchWithModelHelp("orange powder under my leaves", misleading, DISEASES);
  assert.equal(farmerSaidRust.kind === "confident" && farmerSaidRust.best.key, "rust");
  const onlyModelKnows = matchWithModelHelp("mabaka ya kahawia", misleading, DISEASES);
  assert.equal(onlyModelKnows.kind, "confirmFirst");
});

const label: ProductLabel = {
  kind: "fungicide",
  productName: "Copper Hydroxide 77WP",
  activeIngredient: "copper hydroxide",
  registrationNumber: "REG-1",
  batchNumber: "B 2291",
  expiry: "2026-08",
};
const context = { today: new Date("2026-10-03"), flaggedBatchNumbers: new Set(["b2291"]) };

test("label checks: flagged batch, expiry, missing registration, unreadable", async () => {
  const reading = await readProductLabel(fakeModel(JSON.stringify(label)), "aGk=");
  assert.equal(reading.status, "ok");
  assert.deepEqual(checkProductLabel(reading, context), { kind: "flagged_batch", batchNumber: "B 2291" });
  const unflagged = { ...context, flaggedBatchNumbers: new Set<string>() };
  assert.deepEqual(checkProductLabel(reading, unflagged), { kind: "expired", expiry: "2026-08" });
  const fresh = { status: "ok" as const, value: { ...label, expiry: "2026-10", registrationNumber: null } };
  assert.deepEqual(checkProductLabel(fresh, unflagged), { kind: "no_registration" });
  const unreadable = { status: "ok" as const, value: { ...label, kind: "unreadable" as const } };
  assert.equal(checkProductLabel(unreadable, unflagged).kind, "ask_a_person");
});

test("a malformed expiry date is rejected rather than trusted", async () => {
  const reading = await readProductLabel(fakeModel(JSON.stringify({ ...label, expiry: "soon" })), "aGk=");
  assert.deepEqual(reading, { status: "unsure", reason: "model output has an invalid expiry" });
});

const verdict: VerdictToPhrase = {
  english: "Spray copper again tomorrow morning. Use 50 g in a 20 litre sprayer.",
  approvedSwahili: "Nyunyizia shaba tena kesho asubuhi. Tumia gramu 50 kwenye bomba la lita 20.",
  mustKeep: ["50", "20"],
  maxChars: 160,
};

test("phrasing guard rejects dropped or invented numbers", () => {
  assert.equal(phrasingProblem("Nyunyizia shaba kesho, gramu 50 kwa lita 20.", verdict), null);
  assert.equal(phrasingProblem("Nyunyizia shaba kesho, gramu 50.", verdict), 'dropped "20"');
  assert.equal(phrasingProblem("Tumia gramu 50 kwa lita 20 mara 3.", verdict), "invented the number 3");
});

test("a rejected phrasing falls back to the approved Swahili text", async () => {
  const phrased = await phraseVerdictInSwahili(fakeModel("Tumia gramu 500."), verdict);
  assert.equal(phrased.source, "approved_text");
  assert.equal(phrased.text, verdict.approvedSwahili);
});

test("llama-server adapter sends the catalog's template options and an image", async () => {
  const spec = activeLocalModel();
  const body = buildChatBody(spec, { system: "s", prompt: "p", imageJpegBase64: "aGk=", maxTokens: 10 });
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  const content = (body.messages as { content: unknown }[])[1].content as { type: string }[];
  assert.deepEqual(content.map((part) => part.type), ["image_url", "text"]);

  const fetchStub = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }))) as typeof fetch;
  const model = createLlamaServerModel(spec, "http://localhost:1", fetchStub);
  assert.equal(await model.complete({ system: "s", prompt: "p", maxTokens: 10 }), "{}");
});

test("catalog knows each model's download size and how to serve it", () => {
  const spec = LOCAL_MODELS["qwen3.5-0.8b"];
  assert.equal(totalDownloadBytes(spec), 737_504_352);
  assert.equal(totalDownloadBytes(LOCAL_MODELS["qwen3.5-2b"]), 1_949_063_104);
  assert.match(llamaServerCommand(spec, "/m", 8089), /--mmproj \/m\/qwen3\.5-0\.8b\/mmproj-F16\.gguf --port 8089/);
});
