const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');
const destination = path.join(__dirname, 'runs/efficientnet/mobileDecision.cjs');
esbuild.buildSync({entryPoints: [path.join(__dirname, '../mobile/src/diagnosis/modelDecision.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: destination});
const {pickMostLikely, passesQuality} = require(destination);
const config = require('../mobile/assets/model/model-config.json');
const labels = require('../shared/src/types.ts');
assert.deepEqual(config.app_condition_keys, labels.DISEASE_KEYS);
const predict = (i, value) => { const p = new Float32Array(8); p[i] = value; return pickMostLikely(p); };
assert.equal(predict(7, 1).confidence, 'unclear');
assert.equal(predict(5, 1).confidence, 'unclear');
for (const i of [0, 1, 2, 3, 4, 6]) {
  assert.equal(predict(i, 1).condition, config.app_condition_keys[i]);
  assert.equal(predict(i, 1).confidence, 'confident');
  assert.equal(predict(i, config.calibration.class_thresholds[i] - .001).confidence, 'unclear');
}
assert.throws(() => pickMostLikely(new Float32Array(5)));
const invalid = new Float32Array(8); invalid[0] = NaN;
assert.throws(() => pickMostLikely(invalid));
assert.equal(passesQuality(new Float32Array(224*224*3)), false);
assert.equal(passesQuality(new Float32Array(224*224*3).fill(255)), false);
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'runs/efficientnet/quality_fixtures.json'), 'utf8'));
for (const fixture of fixtures) assert.equal(passesQuality(Float32Array.from(fixture.rgb)), fixture.expected);
console.log('Mobile label mapping, class gates, disabled/unsupported outputs, invalid output, darkness and uniform-image rejection passed.');
