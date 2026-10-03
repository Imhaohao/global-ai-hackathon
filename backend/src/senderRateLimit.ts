const WINDOW_MS = 10 * 60 * 1000;
const MAX_REPLIES_PER_WINDOW = 5;

export class SenderRateLimit {
  private readonly repliesBySender = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  allow(sender: string): boolean {
    const windowStart = this.now() - WINDOW_MS;
    const recent = (this.repliesBySender.get(sender) ?? []).filter((at) => at > windowStart);
    if (recent.length >= MAX_REPLIES_PER_WINDOW) {
      this.repliesBySender.set(sender, recent);
      return false;
    }
    this.repliesBySender.set(sender, [...recent, this.now()]);
    return true;
  }
}
