import { AuthApiError, type AuthApi } from './authApi';
import { isCanonicalPhone, type AuthSession, type ServerSession } from './session';

const SIGN_IN_DELAY_MS = 1500;
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const RESEND_AFTER_SECONDS = 30;
const TOKEN_LENGTH = 64;
const TOKEN_PADDING = 'f';

export type DemoAuth = {
  api: AuthApi;
  signInWithoutCode: (phone: string) => Promise<AuthSession>;
};

export function createDemoAuth(delayMs = SIGN_IN_DELAY_MS): DemoAuth {
  const signInWithoutCode = async (phone: string) => {
    await wait(delayMs);
    return demoSession(phone);
  };
  const api: AuthApi = {
    async sendCode(phone) {
      requireCanonicalPhone(phone);
      await wait(delayMs);
      return RESEND_AFTER_SECONDS;
    },
    verifyCode: (phone) => signInWithoutCode(phone),
    async getSession(token) {
      return serverSessionFromToken(token);
    },
    async logout() {},
  };
  return { api, signInWithoutCode };
}

export function demoSession(phone: string, now = Date.now()): AuthSession {
  requireCanonicalPhone(phone);
  const digits = phone.slice(1);
  return {
    token: digits.padEnd(TOKEN_LENGTH, TOKEN_PADDING),
    accountId: `demo${digits}`,
    phone,
    expiresAt: now + SESSION_LIFETIME_MS,
  };
}

function serverSessionFromToken(token: string, now = Date.now()): ServerSession {
  const phone = `+${token.replace(/f+$/, '')}`;
  if (!isCanonicalPhone(phone)) throw new AuthApiError('Sign in again.', 'unauthorized', 401);
  const { accountId, expiresAt } = demoSession(phone, now);
  return { accountId, phone, expiresAt };
}

function requireCanonicalPhone(phone: string): void {
  if (!isCanonicalPhone(phone)) throw new AuthApiError('Enter a valid phone number.', 'invalid_phone');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
