import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthApiError, AuthNetworkError, AuthProtocolError, createAuthApi } from './authApi';
import { secondsRemaining } from './resendCooldown';

const NOW = Date.now();
const TOKEN = 'b'.repeat(64);
const SESSION = {
  token: TOKEN,
  accountId: 'k1abc123',
  phone: '+254712345678',
  expiresAt: NOW + 30 * 24 * 60 * 60 * 1000,
};

function response(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('send-code posts a canonical phone and language, then returns the server cooldown', async () => {
  let requestBody: unknown;
  const api = createAuthApi(async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return response({ resendAfterSeconds: 60 });
  }, 'https://backend.example');

  assert.equal(await api.sendCode('+254712345678', 'sw'), 60);
  assert.deepEqual(requestBody, { phone: '+254712345678', language: 'sw' });
});

test('verify-code returns only a fully validated bearer session', async () => {
  let requestBody: unknown;
  const api = createAuthApi(async (_url, init) => {
    if (init?.method === 'POST') requestBody = JSON.parse(String(init.body));
    return response(SESSION);
  }, 'https://backend.example');

  const session = await api.verifyCode('+254712345678', '123456');
  assert.deepEqual(requestBody, { phone: '+254712345678', code: '123456' });
  assert.deepEqual(session, SESSION);
  assert.equal(await api.getSession(TOKEN).then((value) => 'token' in value), false);
});

test('API failures keep the recoverable code and retry delay', async () => {
  const api = createAuthApi(
    async () => response({ error: 'Wait before trying again.', code: 'rate_limited', retryAfterSeconds: 60 }, 429),
    'https://backend.example',
  );

  await assert.rejects(api.sendCode('+254712345678', 'en'), (error: unknown) => {
    assert.ok(error instanceof AuthApiError);
    assert.equal(error.code, 'rate_limited');
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterSeconds, 60);
    return true;
  });
});

test('unauthorized restore errors retain their status and malformed success responses fail closed', async () => {
  const unauthorizedApi = createAuthApi(
    async () => response({ error: 'Session expired.', code: 'unauthorized' }, 401),
    'https://backend.example',
  );
  const malformedApi = createAuthApi(async () => response({ accountId: 'bad id' }), 'https://backend.example');

  await assert.rejects(unauthorizedApi.getSession(TOKEN), (error: unknown) => {
    assert.ok(error instanceof AuthApiError);
    assert.equal(error.status, 401);
    return true;
  });
  await assert.rejects(malformedApi.getSession(TOKEN), AuthProtocolError);
});

test('unreachable API requests become network failures', async () => {
  const api = createAuthApi(async () => {
    throw new Error('offline');
  }, 'https://backend.example');

  await assert.rejects(api.sendCode('+254712345678', 'en'), AuthNetworkError);
});

test('logout sends the token as a bearer and accepts 204', async () => {
  let authorization = '';
  let requestMethod = '';
  const api = createAuthApi(async (_url, init) => {
    authorization = new Headers(init?.headers).get('Authorization') ?? '';
    requestMethod = init?.method ?? '';
    return response(null, 204);
  }, 'https://backend.example');

  await api.logout(TOKEN);
  assert.equal(authorization, `Bearer ${TOKEN}`);
  assert.equal(requestMethod, 'POST');
});

test('resend cooldown recalculates from an absolute deadline after a background pause', () => {
  assert.equal(secondsRemaining(61_000, 1_001), 60);
  assert.equal(secondsRemaining(61_000, 59_500), 2);
  assert.equal(secondsRemaining(61_000, 61_000), 0);
});
