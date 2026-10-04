import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export type AccountSession = { accountId: string; phone: string; expiresAt: number };
export type VerificationProvider = {
  send: (phone: string, language: "en" | "sw") => Promise<void>;
  check: (phone: string, code: string) => Promise<string | null>;
};
export type AuthStore = {
  claimAttempt: (phone: string, operation: "send" | "verify") => Promise<number>;
  createSession: (phone: string, tokenHash: string, verificationSid: string, expiresAt: number) => Promise<AccountSession | null>;
  findSession: (tokenHash: string) => Promise<AccountSession | null>;
  revokeSession: (tokenHash: string) => Promise<void>;
};

export class VerificationError extends Error {
  constructor(public readonly code: "rate_limited" | "unavailable" | "invalid_phone" | "invalid_code") {
    super(code);
  }
}

export function normalizeLoginPhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40 || !/^\+[\d ()-]+$/.test(value)) return null;
  const phone = value.replace(/[ ()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export async function hashSessionToken(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearerToken(authorization: string | undefined): string | null {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? "");
  return match?.[1] ?? null;
}

const ERROR_MESSAGES = {
  rate_limited: "Too many attempts. Wait a few minutes before trying again.",
  unavailable: "SMS login is unavailable right now. Please try again later.",
  invalid_phone: "Enter a mobile number with its country code, such as +254712345678.",
  invalid_code: "That code is incorrect or expired. Try again or request a new code.",
};

export function createPhoneAuthApp(provider: VerificationProvider | null, store: AuthStore): Hono {
  const app = new Hono();
  app.use("*", bodyLimit({ maxSize: 2048, onError: (c) => c.json({ error: "Send only a phone number and verification code.", code: "invalid_phone" }, 413) }));
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.onError((error, c) => {
    const code = error instanceof VerificationError ? error.code : "unavailable";
    const status = { rate_limited: 429, unavailable: 503, invalid_phone: 400, invalid_code: 401 } as const;
    if (code === "rate_limited") c.header("Retry-After", "60");
    return c.json({ error: ERROR_MESSAGES[code], code }, status[code]);
  });

  app.post("/send-code", async (c) => {
    const body = await c.req.json().catch(() => null);
    const phone = normalizeLoginPhone(body?.phone);
    if (!phone) throw new VerificationError("invalid_phone");
    if (!provider) throw new VerificationError("unavailable");
    const retryAfterSeconds = await store.claimAttempt(phone, "send");
    if (retryAfterSeconds > 0) {
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json({ error: ERROR_MESSAGES.rate_limited, code: "rate_limited", retryAfterSeconds }, 429);
    }
    await provider.send(phone, body?.language === "sw" ? "sw" : "en");
    return c.json({ resendAfterSeconds: 60 });
  });

  app.post("/verify-code", async (c) => {
    const body = await c.req.json().catch(() => null);
    const phone = normalizeLoginPhone(body?.phone);
    if (!phone) throw new VerificationError("invalid_phone");
    if (typeof body?.code !== "string" || !/^\d{4,10}$/.test(body.code)) throw new VerificationError("invalid_code");
    if (!provider) throw new VerificationError("unavailable");
    const retryAfterSeconds = await store.claimAttempt(phone, "verify");
    if (retryAfterSeconds > 0) {
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json({ error: ERROR_MESSAGES.rate_limited, code: "rate_limited", retryAfterSeconds }, 429);
    }
    const verificationSid = await provider.check(phone, body.code);
    if (!verificationSid) throw new VerificationError("invalid_code");
    const token = newSessionToken();
    const session = await store.createSession(phone, await hashSessionToken(token), verificationSid, Date.now() + SESSION_LIFETIME_MS);
    if (!session) throw new VerificationError("invalid_code");
    return c.json({ ...session, token });
  });

  app.get("/session", async (c) => {
    const token = bearerToken(c.req.header("Authorization"));
    const session = token ? await store.findSession(await hashSessionToken(token)) : null;
    if (!session || session.expiresAt <= Date.now()) return c.json({ error: "Sign in again with your phone number.", code: "unauthorized" }, 401);
    return c.json(session);
  });

  app.post("/logout", async (c) => {
    const token = bearerToken(c.req.header("Authorization"));
    if (token) await store.revokeSession(await hashSessionToken(token));
    return c.body(null, 204);
  });
  return app;
}
