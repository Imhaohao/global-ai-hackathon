export const MAX_REPLIES_PER_WINDOW = 5;
export const CONVERSATION_REPLIES_PER_WINDOW = 15;
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
