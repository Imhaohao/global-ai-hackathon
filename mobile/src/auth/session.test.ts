import assert from 'node:assert/strict';
import test from 'node:test';

import { accountStorageSegments, createSessionRevision, isSessionExpired, validateSavedSession, validateServerSession } from './session';
import { createSessionMutationQueue } from './sessionMutationQueue';

const NOW = 1_800_000_000_000;
const VALID_SESSION = {
  token: 'a'.repeat(64),
  accountId: 'k1abc123',
  phone: '+254712345678',
  expiresAt: NOW + 1_000,
};

test('saved sessions require a valid token, account, canonical phone, and future expiry', () => {
  assert.deepEqual(validateSavedSession(VALID_SESSION, NOW), VALID_SESSION);
  assert.equal(validateSavedSession({ ...VALID_SESSION, token: 'bad' }, NOW), null);
  assert.equal(validateSavedSession({ ...VALID_SESSION, accountId: '../other' }, NOW), null);
  assert.equal(validateSavedSession({ ...VALID_SESSION, phone: '0712345678' }, NOW), null);
  assert.equal(validateSavedSession({ ...VALID_SESSION, expiresAt: NOW }, NOW), null);
});

test('session expiry locks at the exact expiration time', () => {
  const session = validateSavedSession(VALID_SESSION, NOW);
  assert.ok(session);
  assert.equal(isSessionExpired(session, NOW + 999), false);
  assert.equal(isSessionExpired(session, NOW + 1_000), true);
  assert.equal(validateServerSession({ ...VALID_SESSION, expiresAt: 'later' }, NOW), null);
});

test('account storage segments reject path traversal and keep account files grouped', () => {
  assert.deepEqual(accountStorageSegments('k1abc123'), ['accounts', 'k1abc123']);
  assert.throws(() => accountStorageSegments('../legacy'));
  assert.throws(() => accountStorageSegments('..'));
});

test('a late restore result cannot apply after a newer sign-out operation', () => {
  const revision = createSessionRevision();
  const restoreAttempt = revision.next();
  const signOutAttempt = revision.next();
  assert.equal(revision.isCurrent(restoreAttempt), false);
  assert.equal(revision.isCurrent(signOutAttempt), true);
});

test('secure session writes and sign-out deletion stay ordered when restore finishes late', async () => {
  const revision = createSessionRevision();
  const enqueue = createSessionMutationQueue(revision);
  const log: string[] = [];
  let releaseWrite: (() => void) | undefined;
  let notifyWriteStarted: (() => void) | undefined;
  const writeStarted = new Promise<void>((resolve) => {
    notifyWriteStarted = resolve;
  });
  const restore = enqueue(revision.next(), async () => {
    log.push('write-start');
    notifyWriteStarted?.();
    await new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    log.push('write-finish');
  });
  await writeStarted;
  const signOutAttempt = revision.next();
  const signOut = enqueue(signOutAttempt, async () => {
    log.push('delete');
  });

  assert.deepEqual(log, ['write-start']);
  releaseWrite?.();
  assert.equal(await restore, false);
  assert.equal(await signOut, true);
  assert.deepEqual(log, ['write-start', 'write-finish', 'delete']);
});
