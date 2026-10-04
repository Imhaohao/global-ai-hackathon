import assert from 'node:assert/strict';
import test from 'node:test';

import { classifySmsResult } from './smsResult';

test('only the confirmed sent result is treated as delivered', () => {
  assert.equal(classifySmsResult('sent'), 'sent');
  assert.equal(classifySmsResult('cancelled'), 'cancelled');
  assert.equal(classifySmsResult('unknown'), 'opened');
});

test('unrecognized composer results remain honest about delivery', () => {
  assert.equal(classifySmsResult('future-platform-status'), 'opened');
  assert.notEqual(classifySmsResult('unknown'), 'sent');
});
