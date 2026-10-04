export type AuthSession = {
  token: string;
  accountId: string;
  phone: string;
  expiresAt: number;
};

export type ServerSession = Omit<AuthSession, 'token'>;

export function accountStorageSegments(accountId: string): ['accounts', string] {
  if (!isAccountId(accountId)) throw new Error('Invalid account ID');
  return ['accounts', accountId];
}

export function createSessionRevision() {
  let revision = 0;
  return {
    next: () => ++revision,
    isCurrent: (value: number) => value === revision,
  };
}

export function isCanonicalPhone(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value);
}

export function isAccountId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{1,128}$/.test(value);
}

export function validateServerSession(value: unknown, now = Date.now()): ServerSession | null {
  if (!isRecord(value)) return null;
  if (!isAccountId(value.accountId) || !isCanonicalPhone(value.phone)) return null;
  if (!isValidExpiry(value.expiresAt, now)) return null;
  return { accountId: value.accountId, phone: value.phone, expiresAt: value.expiresAt };
}

export function validateSavedSession(value: unknown, now = Date.now()): AuthSession | null {
  if (!isRecord(value)) return null;
  if (typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token)) return null;
  const serverSession = validateServerSession(value, now);
  return serverSession ? { ...serverSession, token: value.token } : null;
}

export function isSessionExpired(session: AuthSession, now = Date.now()): boolean {
  return session.expiresAt <= now;
}

function isValidExpiry(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > now;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
