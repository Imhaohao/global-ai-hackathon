export function secondsRemaining(deadline: number, now = Date.now()): number {
  return Math.max(Math.ceil((deadline - now) / 1000), 0);
}
