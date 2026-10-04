import assert from 'node:assert/strict';
import test from 'node:test';

import { STRINGS } from '../i18n/strings';
import { DEMO_SEED_BARCODES, lookUpSeedBarcode } from './seedBarcode';
import { seedReportText } from './seedReport';

test('a recalled seed report names the barcode, variety, lot and verdict', () => {
  const report = seedReportText(lookUpSeedBarcode(DEMO_SEED_BARCODES.recalled), STRINGS.en);
  for (const fact of [DEMO_SEED_BARCODES.recalled, 'Ruiru 11', 'RU-2509-23', 'Do not plant this seed']) {
    assert.ok(report.includes(fact), `missing ${fact} in: ${report}`);
  }
});

test('an unrecognized code report carries the raw code and no invented packet details', () => {
  const report = seedReportText(lookUpSeedBarcode('5012345678900'), STRINGS.en);
  assert.ok(report.includes('5012345678900'));
  assert.ok(!report.includes('lot'));
  assert.ok(!report.includes('{'));
});
