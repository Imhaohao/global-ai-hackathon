const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('../node_modules/esbuild');
const jpeg = require('../mobile/node_modules/jpeg-js');

const root = path.join(__dirname, '..');
const config = require('../mobile/assets/model/model-config.json');

function loadModule(file, overrides = {}) {
  const built = esbuild.buildSync({
    entryPoints: [path.join(root, file)], bundle: true, platform: 'node', format: 'cjs',
    write: false, external: ['expo-image-manipulator', 'jpeg-js'],
  });
  const module = { exports: {} };
  vm.runInNewContext(built.outputFiles[0].text, {
    module, exports: module.exports, require, Float32Array, Uint8Array, ArrayBuffer,
    console, performance, atob, TextEncoder, TextDecoder, __DEV__: false, ...overrides,
  });
  return module.exports;
}

function checkConfig() {
  const { DISEASE_KEYS } = loadModule('shared/src/types.ts');
  assert.deepEqual(config.app_condition_keys, Array.from(DISEASE_KEYS));
  assert.deepEqual(config.labels, ['cercospora', 'healthy', 'miner', 'phoma', 'rust', 'red_spider_mite', 'weevil_damage', 'unsupported']);
  assert.equal(config.input, 'float32 raw RGB 0..255 NHWC');
  assert.equal(Math.floor(224 / config.crop_pct), 256);
  assert.equal(config.calibration.class_thresholds.length, 7);
  assert.equal(config.calibration.confident_thresholds.length, 7);
  assert.ok(config.calibration.class_thresholds[5] > 1);
  assert.ok(config.calibration.confident_thresholds[5] > 1);
  const artifact = fs.readFileSync(path.join(root, 'mobile/assets/model/coffee-leaf.tflite'));
  assert.equal(crypto.createHash('sha256').update(artifact).digest('hex'), config.calibration.artifact_sha256);
}

function checkDecisions(pickMostLikely, passesQuality) {
  const predict = (index, value) => {
    const probabilities = new Float32Array(8);
    probabilities[index] = value;
    return pickMostLikely(probabilities);
  };
  for (const index of [5, 7]) assert.equal(predict(index, 1).confidence, 'unclear');
  for (const index of [0, 1, 2, 3, 4, 6]) {
    assert.equal(predict(index, 1).condition, config.app_condition_keys[index]);
    assert.equal(predict(index, 1).confidence, 'confident');
    assert.equal(predict(index, config.calibration.class_thresholds[index] - .001).confidence, 'unclear');
  }
  assert.throws(() => pickMostLikely(new Float32Array(5)));
  const invalid = new Float32Array(8);
  invalid[0] = NaN;
  assert.throws(() => pickMostLikely(invalid));
  for (const value of [-0.1, 1.1, Infinity]) assert.throws(() => predict(5, value));
  for (const value of [0, 255]) assert.equal(passesQuality(new Float32Array(224 * 224 * 3).fill(value)), false);
}

async function encodeFixture(textured, format) {
  const data = Buffer.alloc(224 * 224 * 4);
  for (let pixel = 0; pixel < 224 * 224; pixel++) {
    const light = textured ? ((Math.floor(pixel / 224) + pixel % 224) % 2 ? 220 : 60) : 0;
    data.fill(light, pixel * 4, pixel * 4 + 3);
    data[pixel * 4 + 3] = 255;
  }
  if (format === 'png') {
    const { encode } = await import('../mobile/node_modules/fast-png/lib/index.js');
    return Buffer.from(encode({ data, width: 224, height: 224, channels: 4 })).toString('base64');
  }
  return jpeg.encode({ data, width: 224, height: 224 }, 100).data.toString('base64');
}

async function checkClassification(development, textured, classIndex) {
  const operations = [];
  const logs = [];
  const context = {
    resize(value) { operations.push(['resize', value]); return this; },
    crop(value) { operations.push(['crop', value]); return this; },
    async renderAsync() { return { saveAsync: async (options) => ({ base64: await encodeFixture(textured, options.format) }) }; },
  };
  const { classifyLeaf } = loadModule('mobile/src/diagnosis/classifyLeaf.ts', {
    __DEV__: development,
    performance: { now: (() => { let time = 0; return () => (time += 12.5); })() },
    console: { log: value => logs.push(value) },
    require: name => name === 'expo-image-manipulator'
      ? { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg', PNG: 'png' } }
      : require(name === 'jpeg-js' ? '../mobile/node_modules/jpeg-js' : name),
  });
  const model = {
    async run(inputs) {
      const input = new Float32Array(inputs[0]);
      assert.equal(input.length, 224 * 224 * 3);
      assert.ok(input.every(value => value >= 0 && value <= 255));
      const probabilities = new Float32Array(8);
      probabilities[classIndex] = 1;
      return [probabilities.buffer];
    },
  };
  const result = await classifyLeaf(model, { uri: 'fixture.jpg', width: 400, height: 200 });
  assert.equal(result.qualityPassed, textured);
  assert.equal(result.confidence, textured && ![5, 7].includes(classIndex) ? 'confident' : 'unclear');
  assert.equal(result.qualityIssue, textured ? undefined : 'too_dark');
  const keys = ['condition', 'confidence', 'probability', 'qualityPassed'];
  if (!textured) keys.push('qualityIssue');
  assert.deepEqual(Object.keys(result).sort(), keys.sort());
  assert.deepEqual(JSON.parse(JSON.stringify(operations)), [['resize', { width: 512, height: 256 }], ['crop', { originX: 144, originY: 16, width: 224, height: 224 }]]);
  assert.deepEqual(logs, development ? [`[leaf-model] inference_ms=12.5 quality=${textured}`] : []);
}

async function main() {
  checkConfig();
  const { pickMostLikely, passesQuality } = loadModule('mobile/src/diagnosis/modelDecision.ts');
  checkDecisions(pickMostLikely, passesQuality);
  await checkClassification(true, true, 4);
  await checkClassification(true, false, 4);
  await checkClassification(false, true, 4);
  await checkClassification(true, true, 5);
  await checkClassification(true, true, 7);
  require('./check_brightness.cjs');
  console.log('Mobile contract passed: artifact hash, labels, preprocessing, gates, qualityPassed and development-only inference timing.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
