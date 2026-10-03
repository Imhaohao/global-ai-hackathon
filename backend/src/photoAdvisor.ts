import type Anthropic from "@anthropic-ai/sdk";
import { DISEASE_KEYS, fitToSms } from "../../shared/src/index.ts";
import { CONDITION_NOTES, MODEL, replyText, STYLE_RULES } from "./advisor.ts";
import type { ConversationHistory } from "./conversationStore.ts";

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
  reply: string;
}

export const PHOTO_UNAVAILABLE_REPLY =
  "I could not look at your photo right now. Please tell me in words what the leaf looks like: colour of the spots, top or underneath, and any powder, rings or tunnels.";

export const PHOTO_SYSTEM_PROMPT = `You are Leaf Doctor, a coffee plant advisor. A smallholder farmer sent a photo by MMS from a basic phone, so it may be small, blurry or dark. Look at the photo and follow the same steps as the Leaf Doctor app.

1. Decide the condition, using only the conditions below. Use "unknown" if it is not a coffee leaf or none fit.
2. Decide confidence:
   - "confident": the signs are clearly visible and match one condition.
   - "possible": it probably matches one condition, but a key sign (for example powder underneath, a grub inside, black shoot tips) cannot be seen.
   - "unclear": the photo is too blurry, too dark, too far away, or not a coffee leaf.
3. Write the reply to the farmer:
   - confident: name the condition, say "Act soon" if its urgency is high, then give the two or three most useful steps from its list.
   - possible: say what it might be, then ask ONE simple question that would confirm it (use the "How to tell apart" line).
   - unclear: say kindly that you cannot tell from this photo, and explain how to take a better one: one leaf, in daylight, close enough to fill the picture, and also the underside if there are spots.
   - If they also wrote a caption, use it as extra information.

Reply rules:
${STYLE_RULES}

${CONDITION_NOTES}`;

const PHOTO_READING_SCHEMA = {
  type: "object",
  properties: {
    condition: { type: "string", enum: [...DISEASE_KEYS, "unknown"] },
    confidence: { type: "string", enum: ["confident", "possible", "unclear"] },
    reply: { type: "string" },
  },
  required: ["condition", "confidence", "reply"],
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
    if (!knownCondition || !knownConfidence || typeof parsed.reply !== "string" || !parsed.reply.trim()) return null;
    return parsed as PhotoReading;
  } catch {
    return null;
  }
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
      try {
        const response = await createClient().beta.messages.create({
          model: MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low", format: { type: "json_schema", schema: PHOTO_READING_SCHEMA } },
          system: PHOTO_SYSTEM_PROMPT,
          messages: [...(await store.history(phone)), photoMessage(photo)],
        });
        const reading = parsePhotoReading(replyText(response));
        if (!reading) return PHOTO_UNAVAILABLE_REPLY;
        console.log(`Photo reading: ${reading.condition} (${reading.confidence})`);
        const smsAnswer = fitToSms(reading.reply);
        await store.append(phone, historyNoteForPhoto(photo.caption), smsAnswer);
        return smsAnswer;
      } catch (error) {
        console.error("Claude photo request failed:", error);
        return PHOTO_UNAVAILABLE_REPLY;
      }
    },
  };
}
