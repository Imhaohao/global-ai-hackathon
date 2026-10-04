import { DEFAULT_BACKEND_URL } from '../../../shared/src/backendUrl';
import { isCanonicalPhone, validateServerSession, type AuthSession, type ServerSession } from './session';

const REQUEST_TIMEOUT_MS = 12_000;
const PHONE_CODE_PATTERN = /^\d{4,10}$/;
const ERROR_CODES = ['invalid_phone', 'invalid_code', 'rate_limited', 'unavailable', 'unauthorized'] as const;
type AuthErrorCode = (typeof ERROR_CODES)[number];

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: AuthErrorCode,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export class AuthNetworkError extends Error {
  constructor() {
    super('The connection could not be reached. Check your internet connection and try again.');
    this.name = 'AuthNetworkError';
  }
}

export class AuthProtocolError extends Error {
  constructor() {
    super('The server returned an invalid response. Try again later.');
    this.name = 'AuthProtocolError';
  }
}

export type AuthApi = ReturnType<typeof createAuthApi>;

export function getBackendUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || DEFAULT_BACKEND_URL;
  let parsed: URL;
  try {
    parsed = new URL(configuredUrl);
  } catch {
    throw new AuthProtocolError();
  }
  if (!isAllowedProtocol(parsed)) throw new AuthProtocolError();
  return configuredUrl.replace(/\/$/, '');
}

export function createAuthApi(
  fetcher: typeof fetch = fetch,
  backendUrl: string | undefined = undefined,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const resolveBackendUrl = () => (backendUrl ?? getBackendUrl()).replace(/\/$/, '');
  return {
    async sendCode(phone: string, language: 'en' | 'sw'): Promise<number> {
      if (!isCanonicalPhone(phone)) throw new AuthApiError('Enter a valid phone number.', 'invalid_phone');
      const response = await requestJson(fetcher, resolveBackendUrl(), '/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ phone, language }),
      }, timeoutMs);
      const resendAfterSeconds = recordField(response, 'resendAfterSeconds');
      if (!isPositiveInteger(resendAfterSeconds) || resendAfterSeconds > 600) throw new AuthProtocolError();
      return resendAfterSeconds;
    },
    async verifyCode(phone: string, code: string): Promise<AuthSession> {
      if (!isCanonicalPhone(phone)) throw new AuthApiError('Enter a valid phone number.', 'invalid_phone');
      if (!PHONE_CODE_PATTERN.test(code)) throw new AuthApiError('Enter the code from your text message.', 'invalid_code');
      const response = await requestJson(fetcher, resolveBackendUrl(), '/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }, timeoutMs);
      const serverSession = validateServerSession(response);
      if (!serverSession || !isToken(response)) throw new AuthProtocolError();
      return { ...serverSession, token: response.token };
    },
    async getSession(token: string): Promise<ServerSession> {
      const response = await requestJson(fetcher, resolveBackendUrl(), '/auth/session', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, timeoutMs);
      const session = validateServerSession(response);
      if (!session) throw new AuthProtocolError();
      return session;
    },
    async logout(token: string): Promise<void> {
      await requestNoContent(fetcher, resolveBackendUrl(), '/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, timeoutMs);
    },
  };
}

async function requestJson(
  fetcher: typeof fetch,
  backendUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const response = await sendRequest(fetcher, `${backendUrl}${path}`, init, timeoutMs);
  const body = await readBody(response);
  if (!response.ok) throw apiError(body, response.status);
  if (!isRecord(body)) throw new AuthProtocolError();
  return body;
}

async function requestNoContent(
  fetcher: typeof fetch,
  backendUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<void> {
  const response = await sendRequest(fetcher, `${backendUrl}${path}`, init, timeoutMs);
  if (!response.ok) throw apiError(await readBody(response), response.status);
}

async function sendRequest(fetcher: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new AuthNetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    if (response.ok) throw new AuthProtocolError();
    return null;
  }
}

function apiError(value: unknown, status: number): AuthApiError {
  const rawCode = recordField(value, 'code');
  const code: AuthErrorCode = isErrorCode(rawCode) ? rawCode : 'unavailable';
  const message = recordField(value, 'error');
  const retryAfterSeconds = recordField(value, 'retryAfterSeconds');
  return new AuthApiError(
    typeof message === 'string' ? message : 'Unable to complete that request. Try again.',
    code,
    status,
    isPositiveInteger(retryAfterSeconds) ? retryAfterSeconds : undefined,
  );
}

function isAllowedProtocol(url: URL): boolean {
  if (url.protocol === 'https:') return true;
  const isDevelopment = (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ === true;
  if (!isDevelopment || url.protocol !== 'http:') return false;
  return isLocalHost(url.hostname);
}

function isLocalHost(hostname: string): boolean {
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.local')) return true;
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isToken(value: Record<string, unknown>): value is Record<string, unknown> & { token: string } {
  return typeof value.token === 'string' && /^[a-f0-9]{64}$/.test(value.token);
}

function isErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === 'string' && ERROR_CODES.includes(value as AuthErrorCode);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function recordField(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
