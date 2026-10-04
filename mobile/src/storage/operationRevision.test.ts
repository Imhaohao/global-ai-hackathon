import assert from 'node:assert/strict';
import test from 'node:test';

import { isCurrentDataOperation } from './operationRevision';

test('a delete-all data revision invalidates an in-flight operation for the same account', () => {
  const operation = { generation: 3, dataRevision: 11 };

  assert.equal(isCurrentDataOperation(operation, 3, 11, true), true);
  assert.equal(isCurrentDataOperation(operation, 3, 12, true), false);
});

test('revoked consent invalidates a rain operation before its response is applied', () => {
  const operation = { generation: 8, dataRevision: 4 };

  assert.equal(isCurrentDataOperation(operation, 8, 4, false), false);
  assert.equal(isCurrentDataOperation(operation, 9, 4, true), false);
});
