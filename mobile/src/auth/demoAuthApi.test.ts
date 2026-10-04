import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthApiError } from './authApi';
import { createDemoAuth } from './demoAuthApi';
import { validateSavedSession } from './session';

const PHONE = '+254712345678';

test('demo sign-in returns a session the app accepts and can restore after relaunch', async () => {
  const { api, signInWithoutCode } = createDemoAuth(0);
  const session = await signInWithoutCode(PHONE);
  assert.deepEqual(validateSavedSession(session), session);
  const restored = await api.getSession(session.token);
  assert.equal(restored.phone, PHONE);
  assert.equal(restored.accountId, session.accountId);
});

test('the same phone always opens the same demo account', async () => {
  const { signInWithoutCode } = createDemoAuth(0);
  const first = await signInWithoutCode(PHONE);
  const second = await signInWithoutCode(PHONE);
  assert.equal(first.accountId, second.accountId);
  assert.equal(first.token, second.token);
});

test('demo sign-in waits before finishing so the button shows progress', async () => {
  const { signInWithoutCode } = createDemoAuth(50);
  const started = Date.now();
  await signInWithoutCode(PHONE);
  assert.ok(Date.now() - started >= 45);
});

test('demo sign-in rejects invalid phones and unreadable tokens', async () => {
  const { api, signInWithoutCode } = createDemoAuth(0);
  await assert.rejects(signInWithoutCode('0712'), AuthApiError);
  await assert.rejects(api.getSession('f'.repeat(64)), AuthApiError);
});
