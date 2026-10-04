import assert from 'node:assert/strict';
import test from 'node:test';

import { DEMO_SEED_BARCODES, lookUpSeedBarcode } from './seedBarcode';

test('the genuine demo packet scans as genuine with its lot details', () => {
  const result = lookUpSeedBarcode(DEMO_SEED_BARCODES.genuine);
  assert.equal(result.kind, 'genuine');
  assert.equal(result.kind === 'genuine' && result.packet.variety, 'Batian');
});

test('the recalled demo packet scans as recalled', () => {
  assert.equal(lookUpSeedBarcode(DEMO_SEED_BARCODES.recalled).kind, 'recalled');
});

test('scanner noise around a registered code still matches it', () => {
  assert.equal(lookUpSeedBarcode(` ${DEMO_SEED_BARCODES.genuine.toLowerCase()}\n`).kind, 'genuine');
});

test('an unregistered barcode is reported as unknown, never as genuine or fake', () => {
  assert.deepEqual(lookUpSeedBarcode('5012345678900'), { kind: 'unknown', code: '5012345678900' });
});
