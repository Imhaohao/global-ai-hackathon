import { CONVERSATION_REPLIES_PER_WINDOW, evaluateReply, MAX_REPLIES_PER_WINDOW, WINDOW_MS } from "../../shared/src/index.ts";

export { evaluateReply, MAX_REPLIES_PER_WINDOW, WINDOW_MS };

export function isBlank(body: string): boolean {
  return body.trim().length === 0;
}

export function createReplyGuard(maxReplies = CONVERSATION_REPLIES_PER_WINDOW, windowMs = WINDOW_MS) {
  const timesBySender = new Map<string, number[]>();

  return function shouldReply(sender: string, body: string, now = Date.now()): boolean {
    if (isBlank(body)) return false;
    const decision = evaluateReply(timesBySender.get(sender) ?? [], now, maxReplies, windowMs);
    timesBySender.set(sender, decision.recentReplyTimes);
    return decision.allowed;
  };
}
