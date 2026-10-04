import type Anthropic from "@anthropic-ai/sdk";
import { buildRuleBasedReply, COMPLIANCE_OVERHEAD_CHARS, DISEASES, DISEASE_KEYS, fitToSms, matchSymptoms } from "../../shared/src/index.ts";
import type { AppLanguage, DiseaseKey } from "../../shared/src/index.ts";
import { CONDITION_NOTES, MODEL, ONLINE_PROCESSING_NOTICE, replyText } from "./advisor.ts";
import type { ConversationHistory, Turn } from "./conversationStore.ts";

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BASE64_CHARS = 6_500_000;

export interface LeafPhoto {
  base64: string;
  mediaType: SupportedImageType;
  caption: string;
}

export interface PhotoAdvisor {
  advisePhoto(phone: string, photo: LeafPhoto): Promise<string>;
}

export type PhotoConfidence = "confident" | "possible" | "unclear";

export interface PhotoReading {
  condition: (typeof DISEASE_KEYS)[number] | "unknown";
  confidence: PhotoConfidence;
  language?: AppLanguage;
  reply?: string;
}

export const PHOTO_UNAVAILABLE_REPLY =
  "I could not look at your photo right now. Please tell me in words what the leaf looks like: colour of the spots, top or underneath, and any powder, rings or tunnels.";

export const PHOTO_SYSTEM_PROMPT = `You are Leaf Doctor, a coffee plant advisor. A smallholder farmer sent a photo by MMS from a basic phone, so it may be small, blurry or dark. Look at the photo and follow the same steps as the Leaf Doctor app.

1. Decide the condition, using only the conditions below. Use "unknown" if it is not a coffee leaf or none fit.
2. Decide confidence:
   - "confident": the signs are clearly visible and match one condition.
   - "possible": it probably matches one condition, but a key sign (for example powder underneath, a grub inside, black shoot tips) cannot be seen.
   - "unclear": the photo is too blurry, too dark, too far away, or not a coffee leaf.
3. Return the condition and confidence only. Do not write advice or a treatment recommendation. If the farmer's caption gives a language, return that language; otherwise use "en".

${CONDITION_NOTES}`;

const PHOTO_READING_SCHEMA = {
  type: "object",
  properties: {
    condition: { type: "string", enum: [...DISEASE_KEYS, "unknown"] },
    confidence: { type: "string", enum: ["confident", "possible", "unclear"] },
    language: { type: "string", enum: ["en", "sw"] },
  },
  required: ["condition", "confidence", "language"],
  additionalProperties: false,
} as const;

export function historyNoteForPhoto(caption: string): string {
  return caption ? `[sent a photo of a leaf] ${caption}` : "[sent a photo of a leaf]";
}

export function parsePhotoReading(text: string | null): PhotoReading | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Partial<PhotoReading>;
    const knownCondition = parsed.condition === "unknown" || DISEASE_KEYS.includes(parsed.condition as never);
    const knownConfidence = ["confident", "possible", "unclear"].includes(parsed.confidence as string);
    const knownLanguage = parsed.language === undefined || parsed.language === "en" || parsed.language === "sw";
    const validOptionalReply = parsed.reply === undefined || (typeof parsed.reply === "string" && parsed.reply.trim().length > 0);
    if (!knownCondition || !knownConfidence || !knownLanguage || !validOptionalReply) return null;
    return parsed as PhotoReading;
  } catch {
    return null;
  }
}

function unavailablePhotoReply(isFirstOnlineReply: boolean): string {
  const notice = isFirstOnlineReply ? ONLINE_PROCESSING_NOTICE : "";
  const reservedChars = COMPLIANCE_OVERHEAD_CHARS + (notice ? notice.length + 1 : 0);
  const fallback = fitToSms(PHOTO_UNAVAILABLE_REPLY, reservedChars);
  return notice ? `${notice} ${fallback}` : fallback;
}

function photoMatch(reading: PhotoReading, caption: string) {
  const captionMatch = matchSymptoms(caption, DISEASES);
  if (captionMatch.kind === "confident" && captionMatch.best.key === reading.condition) return captionMatch;
  const best = { key: reading.condition as DiseaseKey, score: 2, matchedWords: [] };
  return { kind: "confirmFirst" as const, best };
}

function ruleBasedPhotoReply(reading: PhotoReading, caption: string, isFirstOnlineReply: boolean): string {
  const notice = isFirstOnlineReply ? ONLINE_PROCESSING_NOTICE : "";
  const reservedChars = COMPLIANCE_OVERHEAD_CHARS + (notice ? notice.length + 1 : 0);
  if (reading.condition === "unknown" || reading.confidence === "unclear") {
    const unavailable = fitToSms(PHOTO_UNAVAILABLE_REPLY, reservedChars);
    return notice ? `${notice} ${unavailable}` : unavailable;
  }
  const policyReply = buildRuleBasedReply(photoMatch(reading, caption), reading.language ?? "en", reservedChars);
  return notice ? `${notice} ${policyReply}` : policyReply;
}

function photoMessage(photo: LeafPhoto): Anthropic.Beta.Messages.BetaMessageParam {
  return {
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.base64 } },
      { type: "text", text: photo.caption ? `Farmer's caption: ${photo.caption}` : "The farmer sent this photo with no caption." },
    ],
  };
}

export function createPhotoAdvisor(createClient: () => Anthropic, store: ConversationHistory): PhotoAdvisor {
  return {
    async advisePhoto(phone, photo) {
      let turns: Turn[] = [];
      try {
        turns = await store.history(phone);
        const response = await createClient().beta.messages.create({
          model: MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low", format: { type: "json_schema", schema: PHOTO_READING_SCHEMA } },
          system: PHOTO_SYSTEM_PROMPT,
          messages: [...turns, photoMessage(photo)],
        });
        const reading = parsePhotoReading(replyText(response));
        if (!reading) return unavailablePhotoReply(turns.length === 0);
        console.log(`Photo reading: ${reading.condition} (${reading.confidence})`);
        const smsAnswer = ruleBasedPhotoReply(reading, photo.caption, turns.length === 0);
        await store.append(phone, historyNoteForPhoto(photo.caption), smsAnswer);
        return smsAnswer;
      } catch (error) {
        console.error("Claude photo request failed:", error);
        return unavailablePhotoReply(turns.length === 0);
      }
    },
  };
}
