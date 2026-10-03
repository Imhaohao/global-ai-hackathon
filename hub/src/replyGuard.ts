export const MAX_REPLIES_PER_WINDOW = 5;
export const WINDOW_MS = 10 * 60 * 1000;

export interface GuardDecision {
  allowed: boolean;
  recentReplyTimes: number[];
}

export function evaluateReply(
  previousReplyTimes: number[],
  now: number,
  maxReplies = MAX_REPLIES_PER_WINDOW,
  windowMs = WINDOW_MS,
): GuardDecision {
  const recentReplyTimes = previousReplyTimes.filter((time) => now - time < windowMs);
  if (recentReplyTimes.length >= maxReplies) {
    return { allowed: false, recentReplyTimes };
  }
  return { allowed: true, recentReplyTimes: [...recentReplyTimes, now] };
}

export function isBlank(body: string): boolean {
  return body.trim().length === 0;
}

export function createReplyGuard(maxReplies = MAX_REPLIES_PER_WINDOW, windowMs = WINDOW_MS) {
  const timesBySender = new Map<string, number[]>();

  return function shouldReply(sender: string, body: string, now = Date.now()): boolean {
    if (isBlank(body)) return false;
    const decision = evaluateReply(timesBySender.get(sender) ?? [], now, maxReplies, windowMs);
    timesBySender.set(sender, decision.recentReplyTimes);
    return decision.allowed;
  };
}
