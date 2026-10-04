export function normalizeSmsSender(sender: string): string {
  return sender.trim();
}

export function updateOptedOutSenders(senders: ReadonlySet<string>, sender: string, optedOut: boolean): Set<string> {
  const next = new Set(senders);
  const key = normalizeSmsSender(sender);
  if (optedOut) next.add(key);
  else next.delete(key);
  return next;
}

export function isOptedOutSender(senders: ReadonlySet<string>, sender: string): boolean {
  return senders.has(normalizeSmsSender(sender));
}

export function createSmsPreferenceState(preferences: SmsPreferences) {
  let senders: Set<string> | null = null;
  let persisted = new Set<string>();
  let failed = false;
  let revision = 0;
  let queue = Promise.resolve();
  let loading: Promise<boolean> | null = null;
  const latestCommands = new Map<string, number>();

  function load(): Promise<boolean> {
    if (failed) return Promise.resolve(false);
    if (senders) return Promise.resolve(true);
    loading ??= preferences.loadOptedOutSenders().then((saved) => {
      persisted = saved;
      senders = new Set(saved);
      return true;
    }).catch(() => {
      failed = true;
      return false;
    });
    return loading;
  }

  function setOptedOut(sender: string, optedOut: boolean): Promise<boolean> {
    const key = normalizeSmsSender(sender);
    const commandRevision = ++revision;
    latestCommands.set(key, commandRevision);
    if (optedOut && senders) senders = updateOptedOutSenders(senders, key, true);
    const operation = queue.then(async () => {
      if (failed || !senders) return false;
      const next = updateOptedOutSenders(persisted, key, optedOut);
      try {
        await preferences.saveOptedOutSenders(next);
        persisted = next;
        if (latestCommands.get(key) === commandRevision) {
          senders = updateOptedOutSenders(senders, key, optedOut);
        }
        return true;
      } catch {
        failed = true;
        return false;
      }
    });
    queue = operation.then(() => undefined);
    return operation;
  }

  return {
    load,
    setOptedOut,
    isLoaded: () => senders !== null && !failed,
    isBlocked: (sender: string) => failed || !senders || isOptedOutSender(senders, sender),
  };
}
import type { SmsPreferences } from './smsPreferences';
