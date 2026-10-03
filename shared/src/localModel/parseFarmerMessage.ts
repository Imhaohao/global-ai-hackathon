import { completeJson, isOneOf, unsure } from "./localModel.ts";
import type { JsonSchema, LocalModel, TaskResult } from "./localModel.ts";

export const MESSAGE_LANGUAGES = ["sw", "en", "mixed", "other"] as const;
export const MESSAGE_TOPICS = ["leaf_symptoms", "spraying", "fertilizer", "other"] as const;
export const SPRAY_PRODUCTS = ["copper", "other_fungicide", "insecticide", "herbicide", "not_mentioned", "unknown"] as const;
export const SPRAYED_WHEN = ["today", "yesterday", "this_week", "earlier", "not_mentioned"] as const;
export const RAIN_AFTER_SPRAYING = ["yes", "no", "not_mentioned"] as const;

export interface FarmerReport {
  language: (typeof MESSAGE_LANGUAGES)[number];
  topic: (typeof MESSAGE_TOPICS)[number];
  symptomsInEnglish: string;
  sprayProduct: (typeof SPRAY_PRODUCTS)[number];
  sprayedWhen: (typeof SPRAYED_WHEN)[number];
  rainAfterSpraying: (typeof RAIN_AFTER_SPRAYING)[number];
}

const MAX_SYMPTOM_CHARS = 200;

export const FARMER_REPORT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    language: { enum: MESSAGE_LANGUAGES },
    topic: { enum: MESSAGE_TOPICS },
    symptomsInEnglish: { type: "string", maxLength: MAX_SYMPTOM_CHARS },
    sprayProduct: { enum: SPRAY_PRODUCTS },
    sprayedWhen: { enum: SPRAYED_WHEN },
    rainAfterSpraying: { enum: RAIN_AFTER_SPRAYING },
  },
  required: ["language", "topic", "symptomsInEnglish", "sprayProduct", "sprayedWhen", "rainAfterSpraying"],
};

export const PARSE_SYSTEM_PROMPT = `You read SMS messages from coffee farmers in Kenya and Tanzania. Messages are in Swahili, English, or a mix. Fill in the JSON fields from what the message says. Never add anything the farmer did not say.

symptomsInEnglish: what the farmer says about the leaves, translated word for word into plain English. Keep "underneath" and "on top" exactly as the farmer said. Empty string if the message says nothing about the leaves.
sprayProduct: copper fungicides are blue or green powders, also called "dawa ya blue", "dawa ya kijani", copper oxychloride, copper hydroxide, Kocide, or Funguran. Use not_mentioned when there is no spraying.

Swahili words: majani = leaves, jani = leaf, unga = powder, chini = underneath, juu = on top, madoa = spots, doa = spot, rangi ya machungwa = orange, manjano or njano = yellow, kahawia = brown, kijivu = grey, nyeusi = black, duara = rings, yanapukutika = falling off, mistari = lines, minyoo = worms, vichuguu = tunnels, ncha = tips, kukauka = drying, nilinyunyiza = I sprayed, dawa = chemical, mbolea = fertilizer, mvua = rain, ikanyesha = it rained, leo = today, jana = yesterday, wiki hii = this week.

Message: majani yana madoa ya kahawia na duara
Output: {"language":"sw","topic":"leaf_symptoms","symptomsInEnglish":"leaves have brown spots with rings","sprayProduct":"not_mentioned","sprayedWhen":"not_mentioned","rainAfterSpraying":"not_mentioned"}

Message: nilinyunyiza dawa ya blue jana, mvua ikanyesha
Output: {"language":"sw","topic":"spraying","symptomsInEnglish":"","sprayProduct":"copper","sprayedWhen":"yesterday","rainAfterSpraying":"yes"}`;

function invalidField(value: Record<string, unknown>): string | null {
  if (!isOneOf(value.language, MESSAGE_LANGUAGES)) return "language";
  if (!isOneOf(value.topic, MESSAGE_TOPICS)) return "topic";
  if (typeof value.symptomsInEnglish !== "string" || value.symptomsInEnglish.length > MAX_SYMPTOM_CHARS) {
    return "symptomsInEnglish";
  }
  if (!isOneOf(value.sprayProduct, SPRAY_PRODUCTS)) return "sprayProduct";
  if (!isOneOf(value.sprayedWhen, SPRAYED_WHEN)) return "sprayedWhen";
  if (!isOneOf(value.rainAfterSpraying, RAIN_AFTER_SPRAYING)) return "rainAfterSpraying";
  return null;
}

export function validateFarmerReport(value: unknown): TaskResult<FarmerReport> {
  if (typeof value !== "object" || value === null) return unsure("model output is not an object");
  const badField = invalidField(value as Record<string, unknown>);
  if (badField) return unsure(`model output has an invalid ${badField}`);
  return { status: "ok", value: value as FarmerReport };
}

export async function parseFarmerMessage(model: LocalModel, message: string): Promise<TaskResult<FarmerReport>> {
  const result = await completeJson(model, {
    task: "parseFarmerMessage",
    system: PARSE_SYSTEM_PROMPT,
    prompt: message,
    outputSchema: FARMER_REPORT_SCHEMA,
    maxTokens: 200,
  });
  return result.status === "ok" ? validateFarmerReport(result.value) : result;
}

export function textForSymptomMatcher(message: string, report: TaskResult<FarmerReport>): string {
  if (report.status !== "ok" || report.value.symptomsInEnglish === "") return message;
  return `${message} ${report.value.symptomsInEnglish}`;
}
