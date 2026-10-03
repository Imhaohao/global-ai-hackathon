import assert from "node:assert/strict";
import { test } from "node:test";
import { DISEASES } from "../diseases.ts";
import { matchSymptoms } from "../matchSymptoms.ts";
import { buildOfflineReply } from "../smsReply.ts";
import { answerWithLocalModel } from "./answerWithLocalModel.ts";
import { matchWithModelHelp } from "./assistedMatch.ts";
import { checkProductLabel } from "./checkProductLabel.ts";
import { buildChatBody, createLlamaServerModel } from "./llamaServerModel.ts";
import type { LocalModel, LocalModelRequest } from "./localModel.ts";
import {
  activeLocalModel,
  filesNeeded,
  huggingFaceFile,
  llamaServerCommand,
  LOCAL_MODELS,
  totalDownloadBytes,
} from "./modelCatalog.ts";
import type { LocalModelSpec } from "./modelCatalog.ts";
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

const parseRequest = { task: "parseFarmerMessage" as const, system: "default prompt", prompt: "p", maxTokens: 10 };

test("llama-server adapter sends the catalog's template options and an image", async () => {
  const spec = activeLocalModel();
  const body = buildChatBody(spec, { ...parseRequest, imageJpegBase64: "aGk=" });
  assert.deepEqual(body.chat_template_kwargs, { enable_thinking: false });
  const content = (body.messages as { content: unknown }[])[1].content as { type: string }[];
  assert.deepEqual(content.map((part) => part.type), ["image_url", "text"]);

  const fetchStub = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }))) as typeof fetch;
  const model = createLlamaServerModel(spec, "http://localhost:1", fetchStub);
  assert.equal(await model.complete(parseRequest), "{}");
});

test("catalog knows each model's download size and how to serve it", () => {
  const spec = LOCAL_MODELS["qwen3.5-0.8b"];
  assert.equal(totalDownloadBytes(spec.files), 737_504_352);
  assert.equal(totalDownloadBytes(filesNeeded(LOCAL_MODELS["qwen3.5-2b"], { images: false })), 1_280_835_840);
  assert.match(llamaServerCommand(spec, "/m", 8089), /--mmproj \/m\/qwen3\.5-0\.8b\/mmproj-F16\.gguf --port 8089/);
});

const fineTuned: LocalModelSpec = {
  id: "leaf-doctor-ft",
  displayName: "Leaf Doctor fine-tune",
  license: "Apache-2.0",
  sourceRepo: "example/leaf-doctor-ft-GGUF",
  files: [
    huggingFaceFile("example/base-GGUF", "weights", "base.gguf", 10, "a".repeat(64)),
    huggingFaceFile("example/leaf-doctor-ft-GGUF", "adapter", "leaf-doctor-lora.gguf", 5, "b".repeat(64)),
  ],
  supportsImages: false,
  recommendedRamBytes: 2_000_000_000,
  systemPromptOverrides: { parseFarmerMessage: "short prompt the fine-tune was trained with" },
};

test("a fine-tuned model can bring a LoRA adapter and its own training prompt", () => {
  assert.match(llamaServerCommand(fineTuned, "/m", 8089), /-m \/m\/leaf-doctor-ft\/base\.gguf --lora \/m\/leaf-doctor-ft\/leaf-doctor-lora\.gguf/);
  const messages = buildChatBody(fineTuned, parseRequest).messages as { content: unknown }[];
  assert.equal(messages[0].content, "short prompt the fine-tune was trained with");
  const labelMessages = buildChatBody(fineTuned, { ...parseRequest, task: "readProductLabel" }).messages as { content: unknown }[];
  assert.equal(labelMessages[0].content, "default prompt");
});

test("a Swahili message the model translated gets a Swahili confirm-first question", async () => {
  const translated = { ...sprayReport, topic: "leaf_symptoms" as const, symptomsInEnglish: "orange powder underneath, leaves falling" };
  const answer = await answerWithLocalModel(fakeModel(JSON.stringify(translated)), "majani yana kitu chini");
  assert.equal(answer.match.kind, "confirmFirst");
  assert.match(answer.reply, /^Huenda ni Kutu ya majani ya kahawa\./);
});

test("without a model the hub answers exactly as before", async () => {
  const answer = await answerWithLocalModel(null, "orange powder under my leaves");
  assert.equal(answer.report.status, "unsure");
  assert.equal(answer.reply, buildOfflineReply(matchSymptoms("orange powder under my leaves", DISEASES), DISEASES));
});

test("JSON wrapped in chat-template leftovers is still read", async () => {
  const wrapped = `<think>\n\n</think>\n\n<|im_start|>assistant\n${JSON.stringify(sprayReport)}`;
  assert.deepEqual(await parseFarmerMessage(fakeModel(wrapped), "x"), { status: "ok", value: sprayReport });
});
