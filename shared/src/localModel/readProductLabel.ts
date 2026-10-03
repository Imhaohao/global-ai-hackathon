import { completeJson, isNullableString, isOneOf, unsure } from "./localModel.ts";
import type { JsonSchema, LocalModel, TaskResult } from "./localModel.ts";

export const PRODUCT_KINDS = ["fertilizer", "fungicide", "insecticide", "herbicide", "other", "unreadable"] as const;

export interface ProductLabel {
  kind: (typeof PRODUCT_KINDS)[number];
  productName: string | null;
  activeIngredient: string | null;
  registrationNumber: string | null;
  batchNumber: string | null;
  expiry: string | null;
}

const MAX_FIELD_CHARS = 80;
const EXPIRY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const nullableText = { type: ["string", "null"], maxLength: MAX_FIELD_CHARS };

export const PRODUCT_LABEL_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    kind: { enum: PRODUCT_KINDS },
    productName: nullableText,
    activeIngredient: nullableText,
    registrationNumber: nullableText,
    batchNumber: nullableText,
    expiry: { type: ["string", "null"], pattern: EXPIRY_PATTERN.source },
  },
  required: ["kind", "productName", "activeIngredient", "registrationNumber", "batchNumber", "expiry"],
};

export const LABEL_SYSTEM_PROMPT = `You read the label on a bag or bottle of a farm product from a phone photo. Copy text exactly as printed. If a field is not printed or you cannot read it, use null. Never guess a number.
kind: fertilizer, fungicide, insecticide, herbicide, other, or unreadable if you cannot read the label at all.
registrationNumber: the registration or approval number from the national pesticide or fertilizer regulator, copied with all its letters and digits.
expiry: the expiry date as YYYY-MM.`;

const TEXT_FIELDS = ["productName", "activeIngredient", "registrationNumber", "batchNumber"] as const;

function invalidField(value: Record<string, unknown>): string | null {
  if (!isOneOf(value.kind, PRODUCT_KINDS)) return "kind";
  const badText = TEXT_FIELDS.find((field) => !isNullableString(value[field], MAX_FIELD_CHARS));
  if (badText) return badText;
  if (value.expiry !== null && !(typeof value.expiry === "string" && EXPIRY_PATTERN.test(value.expiry))) return "expiry";
  return null;
}

export function validateProductLabel(value: unknown): TaskResult<ProductLabel> {
  if (typeof value !== "object" || value === null) return unsure("model output is not an object");
  const badField = invalidField(value as Record<string, unknown>);
  if (badField) return unsure(`model output has an invalid ${badField}`);
  return { status: "ok", value: value as ProductLabel };
}

export async function readProductLabel(model: LocalModel, photoJpegBase64: string): Promise<TaskResult<ProductLabel>> {
  const result = await completeJson(model, {
    system: LABEL_SYSTEM_PROMPT,
    prompt: "Read this label.",
    imageJpegBase64: photoJpegBase64,
    outputSchema: PRODUCT_LABEL_SCHEMA,
    maxTokens: 250,
  });
  return result.status === "ok" ? validateProductLabel(result.value) : result;
}
