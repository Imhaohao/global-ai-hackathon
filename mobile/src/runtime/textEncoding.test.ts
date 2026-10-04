import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('the PNG decoder loads and preserves pixels when the native decoder only supports UTF-8', () => {
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const NativeDecoder = globalThis.TextDecoder;
    globalThis.TextDecoder = class extends NativeDecoder {
      constructor(label = 'utf-8', options) {
        if (label === 'latin1') throw new RangeError('Unknown encoding: latin1');
        super(label, options);
      }
    };
    await import('./src/runtime/textEncoding.ts');
    assert.equal(new TextDecoder('latin1').decode(new Uint8Array([0xe9])), 'é');
    assert.equal(new TextDecoder().decode(new Uint8Array([0xc3, 0xa9])), 'é');
    const { encode, decode } = await import('fast-png');
    const pixels = new Uint8Array([10, 20, 30, 255]);
    const png = encode({ width: 1, height: 1, data: pixels, channels: 4, depth: 8 });
    assert.deepEqual(decode(png).data, pixels);
  `], { cwd: new URL('../../', import.meta.url), stdio: 'pipe' });
});

test('a decoder that already supports Latin-1 is preserved', () => {
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const original = globalThis.TextDecoder;
    await import('./src/runtime/textEncoding.ts');
    assert.equal(globalThis.TextDecoder, original);
  `], { cwd: new URL('../../', import.meta.url), stdio: 'pipe' });
});
