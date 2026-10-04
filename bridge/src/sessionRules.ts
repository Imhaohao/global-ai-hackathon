export const KEYWORD = "LEAF";
export const SESSION_MS = 30 * 60 * 1000;
export const REPLY_PREFIX = "Leaf Doctor: ";
export const PENDING_PHOTO_MS = 2 * 60 * 1000;

export type BridgeDecision =
  | { kind: "welcome" }
  | { kind: "answer"; question: string }
  | { kind: "end" }
  | { kind: "ignore" };

const KEYWORD_PREFIX = new RegExp(`^${KEYWORD}\\b[\\s:,.!-]*`, "i");
const ALERTS_COMMAND = /^alerts\b/i;
const END_WORDS = /^(stop|end|quit|cancel|unsubscribe)[.!]*$/i;

export function isInSession(lastActiveAt: number | undefined, now: number): boolean {
  return lastActiveAt !== undefined && now - lastActiveAt < SESSION_MS;
}

export function decideIncoming(text: string, lastActiveAt: number | undefined, now: number): BridgeDecision {
  const trimmed = text.trim();
  if (trimmed.startsWith(REPLY_PREFIX.trim())) return { kind: "ignore" };
  const inSession = isInSession(lastActiveAt, now);
  if (inSession && END_WORDS.test(trimmed)) return { kind: "end" };

  if (ALERTS_COMMAND.test(trimmed)) return { kind: "answer", question: trimmed };
  if (KEYWORD_PREFIX.test(trimmed)) {
    const question = trimmed.replace(KEYWORD_PREFIX, "").trim();
    return question ? { kind: "answer", question } : { kind: "welcome" };
  }
  if (inSession && trimmed) return { kind: "answer", question: trimmed };
  return { kind: "ignore" };
}

export type PhotoDecision = { kind: "answerPhoto"; caption: string } | { kind: "hold" };

export function decidePhoto(caption: string, lastActiveAt: number | undefined, now: number): PhotoDecision {
  const trimmed = caption.trim();
  if (KEYWORD_PREFIX.test(trimmed)) return { kind: "answerPhoto", caption: trimmed.replace(KEYWORD_PREFIX, "").trim() };
  return isInSession(lastActiveAt, now) ? { kind: "answerPhoto", caption: trimmed } : { kind: "hold" };
}

export function isPendingPhotoFresh(heldAt: number | undefined, now: number): boolean {
  return heldAt !== undefined && now - heldAt < PENDING_PHOTO_MS;
}
