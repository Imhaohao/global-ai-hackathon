export type AuthOperation = "send" | "verify";

export function authLimitRules(phone: string, operation: AuthOperation) {
  return [
    { key: `${operation}:global`, max: operation === "send" ? 100 : 1000, windowMs: 60 * 60 * 1000, cooldownMs: 0 },
    { key: `${operation}:${phone}`, max: operation === "send" ? 3 : 10, windowMs: 10 * 60 * 1000, cooldownMs: operation === "send" ? 60_000 : 0 },
  ];
}

export function authLimitDecision(
  previousTimes: number[],
  now: number,
  rule: { max: number; windowMs: number; cooldownMs: number },
) {
  const times = previousTimes.filter((time) => time > now - rule.windowMs);
  const windowWait = times.length >= rule.max ? times[0] + rule.windowMs - now : 0;
  const cooldownWait = times.length ? times[times.length - 1] + rule.cooldownMs - now : 0;
  const retryAfterSeconds = Math.ceil(Math.max(windowWait, cooldownWait, 0) / 1000);
  return { times, retryAfterSeconds };
}
