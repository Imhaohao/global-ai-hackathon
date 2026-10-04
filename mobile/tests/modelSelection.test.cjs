/* global __dirname */
const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const esbuild = require('../../node_modules/esbuild');
const config = require('../assets/model/model-config.json');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'leaf-model-selection-'));
after(() => {
  for (const name of ['loadModelSelection.cjs', 'modelDecision.cjs']) {
    fs.rmSync(path.join(temporaryDirectory, name), { force: true });
  }
  fs.rmdirSync(temporaryDirectory);
});
esbuild.buildSync({
  entryPoints: ['loadModelSelection', 'modelDecision'].map((name) => path.join(__dirname, '../src/diagnosis', `${name}.ts`)),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: temporaryDirectory,
  outExtension: { '.js': '.cjs' },
});
const { loadModelSelection, assertModelContract } = require(path.join(temporaryDirectory, 'loadModelSelection.cjs'));
const { pickMostLikely } = require(path.join(temporaryDirectory, 'modelDecision.cjs'));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function model() {
  return {
    inputs: [{ dataType: 'float32', shape: [1, 224, 224, 3] }],
    outputs: [{ dataType: 'float32', shape: [1, 8] }],
    disposed: false,
    disposeCount: 0,
    dispose() { this.disposed = true; this.disposeCount += 1; },
  };
}

test('switching across three models ignores late earlier loads and releases unused models', async () => {
  const oldLoad = Promise.withResolvers();
  const middleLoad = Promise.withResolvers();
  const newLoad = Promise.withResolvers();
  const states = [];
  const cancel = loadModelSelection(() => oldLoad.promise, config, (state) => states.push(state));
  cancel();
  const cancelMiddle = loadModelSelection(() => middleLoad.promise, config, (state) => states.push(state));
  cancelMiddle();
  loadModelSelection(() => newLoad.promise, config, (state) => states.push(state));
  const selected = model();
  newLoad.resolve(selected);
  await flush();
  const middle = model();
  middleLoad.resolve(middle);
  await flush();
  const stale = model();
  oldLoad.resolve(stale);
  await flush();
  assert.equal(states.at(-1).model, selected);
  assert.equal(stale.disposed, true);
  cancel();
  cancelMiddle();
  assert.equal(stale.disposeCount, 1);
  assert.equal(middle.disposeCount, 1);
  assert.equal(selected.disposed, false);
  assert.deepEqual(states.map((state) => state.state), ['loading', 'loading', 'loading', 'loaded']);
});

test('cancelling a loaded selection disposes the interpreter exactly once', async () => {
  const selected = model();
  const states = [];
  const cancel = loadModelSelection(async () => selected, config, (state) => states.push(state));
  await flush();
  assert.equal(states.at(-1).model, selected);
  cancel();
  cancel();
  assert.equal(selected.disposeCount, 1);
});

test('a stale failure cannot replace the currently loaded model', async () => {
  const pending = Promise.withResolvers();
  const states = [];
  const cancel = loadModelSelection(() => pending.promise, config, (state) => states.push(state));
  cancel();
  loadModelSelection(async () => model(), config, (state) => states.push(state));
  await flush();
  pending.reject(new Error('old load failed'));
  await flush();
  assert.equal(states.at(-1).state, 'loaded');
  assert.equal(states.some((state) => state.state === 'error'), false);
});

test('a failed model can be retried successfully', async () => {
  const states = [];
  loadModelSelection(async () => { throw new Error('load failed'); }, config, (state) => states.push(state));
  await flush();
  assert.equal(states.at(-1).state, 'error');
  loadModelSelection(async () => model(), config, (state) => states.push(state));
  await flush();
  assert.deepEqual(states.map((state) => state.state), ['loading', 'error', 'loading', 'loaded']);
});

test('a mismatched model is rejected before it can receive a photo', async () => {
  const invalid = model();
  invalid.inputs[0].shape = [1, 240, 240, 3];
  const states = [];
  loadModelSelection(async () => invalid, config, (state) => states.push(state));
  await flush();
  assert.equal(states.at(-1).state, 'error');
  assert.equal(invalid.disposed, true);
  assert.throws(() => assertModelContract(model(), { ...config, labels: config.labels.toReversed() }));
  assert.throws(() => assertModelContract(model(), { ...config, crop_pct: 0.9 }));
  const invalidBlur = structuredClone(config);
  invalidBlur.calibration.quality.minimum_edge_variance = NaN;
  assert.throws(() => assertModelContract(model(), invalidBlur));
});

test('the selected configuration controls class acceptance and mite availability', () => {
  const alternate = structuredClone(config);
  alternate.calibration.class_thresholds[5] = 0.7;
  alternate.calibration.confident_thresholds[5] = 0.9;
  const mites = Float32Array.from([0, 0, 0, 0, 0, 0.95, 0.05, 0]);
  assert.equal(pickMostLikely(mites, config).confidence, 'unclear');
  assert.equal(pickMostLikely(mites, alternate).confidence, 'confident');
  assert.equal(pickMostLikely(mites, alternate).condition, 'mites');
  const unsupported = Float32Array.from([0, 0, 0, 0, 0, 0, 0, 1]);
  assert.equal(pickMostLikely(unsupported, alternate).confidence, 'unclear');
  alternate.calibration.confident_thresholds[5] = 0.6;
  assert.throws(() => assertModelContract(model(), alternate));
});
