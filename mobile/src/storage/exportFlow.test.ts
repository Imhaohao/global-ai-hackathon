import assert from 'node:assert/strict';
import test from 'node:test';

import { shareExportFile } from './exportFlow';

test('export cleanup runs after a successful share', async () => {
  const events: string[] = [];
  const result = await shareExportFile(
    () => {
      events.push('write');
      return 'cache/export.json';
    },
    async (uri) => {
      events.push(`share:${uri}`);
    },
    (uri) => {
      events.push(`cleanup:${uri}`);
      return true;
    },
  );

  assert.equal(result, true);
  assert.deepEqual(events, ['write', 'share:cache/export.json', 'cleanup:cache/export.json']);
});

test('export cleanup runs when the share action fails', async () => {
  let cleaned = false;
  const result = await shareExportFile(
    () => 'cache/export.json',
    async () => {
      throw new Error('share unavailable');
    },
    (uri) => {
      assert.equal(uri, 'cache/export.json');
      cleaned = true;
      return true;
    },
  );

  assert.equal(result, false);
  assert.equal(cleaned, true);
});

test('cleanup failure keeps the export unsuccessful', async () => {
  let cleanedUri = '';
  const result = await shareExportFile(
    () => 'cache/account-a/export-1.json',
    async () => undefined,
    (uri) => {
      cleanedUri = uri;
      return false;
    },
  );

  assert.equal(result, false);
  assert.equal(cleanedUri, 'cache/account-a/export-1.json');
});
