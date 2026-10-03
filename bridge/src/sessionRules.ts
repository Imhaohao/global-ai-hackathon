export const KEYWORD = "LEAF";
export const SESSION_MS = 30 * 60 * 1000;
export const REPLY_PREFIX = "Leaf Doctor: ";

export type BridgeDecision =
  | { kind: "welcome" }
  | { kind: "answer"; question: string }
  | { kind: "end" }
  | { kind: "ignore" };

const KEYWORD_PREFIX = new RegExp(`^${KEYWORD}\\b[\\s:,.!-]*`, "i");
const END_WORDS = /^(stop|end|quit|cancel|unsubscribe)[.!]*$/i;

export function isInSession(lastActiveAt: number | undefined, now: number): boolean {
  return lastActiveAt !== undefined && now - lastActiveAt < SESSION_MS;
}

export function decideIncoming(text: string, lastActiveAt: number | undefined, now: number): BridgeDecision {
  const trimmed = text.trim();
  if (trimmed.startsWith(REPLY_PREFIX.trim())) return { kind: "ignore" };
  const inSession = isInSession(lastActiveAt, now);
  if (inSession && END_WORDS.test(trimmed)) return { kind: "end" };

  if (KEYWORD_PREFIX.test(trimmed)) {
    const question = trimmed.replace(KEYWORD_PREFIX, "").trim();
    return question ? { kind: "answer", question } : { kind: "welcome" };
  }
  if (inSession && trimmed) return { kind: "answer", question: trimmed };
  return { kind: "ignore" };
}
