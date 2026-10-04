const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadClassifier(failure) {
  const released = [];
  const failAt = (stage) => {
    if (stage === failure) throw new Error(stage);
  };
  const image = {
    async saveAsync({ format }) {
      failAt(format);
      return { base64: 'pixels' };
    },
    release: () => released.push('image'),
  };
  const context = {
    resize() { return this; },
    crop() { return this; },
    async renderAsync() { failAt('render'); return image; },
    release: () => released.push('context'),
  };
  const modules = {
    'expo-image-manipulator': { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg', PNG: 'png' } },
    'jpeg-js': { decode: () => { failAt('decode'); return { data: new Uint8Array(4) }; } },
    './imageQuality': { qualityIssueFor: () => undefined },
    './modelDecision': { pickMostLikely: () => ({ condition: 'healthy', probability: 1, confidence: 'confident' }) },
    './photoPixels': {
      base64ToBytes: () => new Uint8Array(4),
      rgbaToRgbFloatTensor: () => new Float32Array(3),
      decodeExposurePng: () => ({}),
    },
    '../../assets/model/model-config.json': { crop_pct: 1, calibration: { quality: { minimum_edge_variance: 0 } } },
  };
  const source = readFileSync(require.resolve('../src/diagnosis/classifyLeaf.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => { assert.ok(name in modules, name); return modules[name]; },
    performance,
    Float32Array,
  });
  const model = { run: async () => {
    assert.deepEqual(released, ['image', 'context']);
    failAt('model');
    return [new Float32Array([1]).buffer];
  } };
  return { classify: () => exports.classifyLeaf(model, { uri: 'test://leaf', width: 224, height: 224 }), released };
}

test('image resources are released before inference and after every preprocessing failure', async () => {
  for (const failure of [undefined, 'render', 'jpeg', 'png', 'decode', 'model']) {
    const { classify, released } = loadClassifier(failure);
    if (failure) await assert.rejects(classify, new RegExp(failure));
    else assert.equal((await classify()).condition, 'healthy');
    assert.deepEqual(released, failure === 'render' ? ['context'] : ['image', 'context']);
  }
});
