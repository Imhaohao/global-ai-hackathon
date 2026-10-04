import assert from 'node:assert/strict';
import test from 'node:test';

import { deleteDataWithCleanup } from './deleteDataFlow';

test('filesystem failure is reported and export cleanup still runs', () => {
  let exportCalled = false;
  const result = deleteDataWithCleanup(
    () => {
      throw new Error('filesystem');
    },
    () => {
      exportCalled = true;
      return true;
    },
  );

  assert.equal(result, false);
  assert.equal(exportCalled, true);
});

test('export cleanup failure makes the overall deletion fail', () => {
  const result = deleteDataWithCleanup(() => true, () => false);

  assert.equal(result, false);
});

test('account and export cleanup must both succeed', () => {
  const result = deleteDataWithCleanup(() => true, () => true);

  assert.equal(result, true);
});
