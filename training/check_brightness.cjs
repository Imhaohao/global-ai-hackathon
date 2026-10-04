const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../node_modules/esbuild');

const output = path.join(__dirname, 'runs/brightness_v1/contracts');
const entries = ['diagnosis/imageQuality', 'diagnosis/photoPixels', 'diagnosis/qualityGuidance', 'i18n/strings'];
esbuild.buildSync({
  entryPoints: entries.map((entry) => path.join(__dirname, '../mobile/src', `${entry}.ts`)),
  bundle: true, platform: 'node', format: 'cjs', outdir: output, outExtension: { '.js': '.cjs' },
});
const quality = require(path.join(output, 'diagnosis/imageQuality.cjs'));
const { decodeExposurePng } = require(path.join(output, 'diagnosis/photoPixels.cjs'));
const { getQualityGuidance } = require(path.join(output, 'diagnosis/qualityGuidance.cjs'));
const { STRINGS } = require(path.join(output, 'i18n/strings.cjs'));
const config = require('../mobile/assets/model/brightness-config.json');
const pixels = 224 * 224;

function textured(low, high) {
  return Float32Array.from({ length: pixels * 3 }, (_, index) => {
    const pixel = Math.floor(index / 3);
    return (Math.floor(pixel / 224) + pixel % 224) % 2 ? low : high;
  });
}

function checkExposureDecisions() {
  assert.equal(quality.qualityIssueFor(textured(0, 2)), 'too_dark');
  assert.equal(quality.qualityIssueFor(textured(252, 255)), 'too_bright');
  assert.equal(quality.qualityIssueFor(textured(80, 120)), undefined);
  assert.equal(quality.qualityIssueFor(new Float32Array(pixels * 3).fill(100)), 'blurred');
  assert.equal(quality.qualityIssueFor(new Float32Array(pixels * 3)), 'too_dark');
  assert.equal(quality.qualityIssueFor(new Float32Array(pixels * 3).fill(255)), 'too_bright');
  assert.throws(() => quality.qualityIssueFor(new Float32Array(3)));
  assert.throws(() => quality.qualityIssueFor(new Float32Array(pixels * 3).fill(NaN)));
  const metrics = { meanLuminance: config.minimum_mean_luminance, highlightFraction: 0, visibleWeight: pixels };
  assert.equal(quality.exposureIssue(metrics), undefined);
  assert.equal(quality.exposureIssue({ ...metrics, meanLuminance: metrics.meanLuminance - 0.001 }), 'too_dark');
  assert.equal(quality.exposureIssue({ ...metrics, meanLuminance: config.maximum_mean_luminance, highlightFraction: 1 }), undefined);
  assert.equal(quality.exposureIssue({ ...metrics, meanLuminance: 255, highlightFraction: config.maximum_highlight_fraction }), undefined);
  assert.equal(quality.exposureIssue({ ...metrics, meanLuminance: 255, highlightFraction: 1 }), 'too_bright');
}

function checkTransparency() {
  const rgb = new Float32Array(pixels * 3);
  const alpha = new Uint8Array(pixels);
  for (let row = 80; row < 144; row++) {
    for (let col = 80; col < 144; col++) {
      const pixel = row * 224 + col;
      rgb.fill((row + col) % 2 ? 80 : 120, pixel * 3, pixel * 3 + 3);
      alpha[pixel] = 255;
    }
  }
  const exposure = { rgb, alpha };
  assert.equal(quality.measureExposure(exposure).meanLuminance, 100);
  assert.equal(quality.qualityIssueFor(rgb, exposure), undefined);
  assert.equal(quality.qualityIssueFor(rgb), 'too_dark');
  assert.equal(quality.qualityIssueFor(rgb, { rgb, alpha: new Uint8Array(pixels) }), 'no_visible_pixels');
  assert.throws(() => quality.measureExposure({ rgb, alpha: new Uint8Array(1) }));
  const halfAlpha = new Uint8Array(pixels).fill(128);
  const half = quality.measureExposure({ rgb: textured(80, 120), alpha: halfAlpha });
  assert.ok(Math.abs(half.meanLuminance - 100) < 1e-8);
  assert.ok(Math.abs(half.visibleWeight - pixels * 128 / 255) < 1e-6);
}

function checkMessages() {
  for (const strings of Object.values(STRINGS)) {
    assert.deepEqual(getQualityGuidance(strings, 'too_dark'), { title: strings.tooDarkTitle, body: strings.tooDarkBody });
    assert.deepEqual(getQualityGuidance(strings, 'too_bright'), { title: strings.tooBrightTitle, body: strings.tooBrightBody });
    assert.deepEqual(getQualityGuidance(strings, 'blurred'), { title: strings.blurredTitle, body: strings.blurredBody });
    assert.deepEqual(getQualityGuidance(strings, undefined), { title: strings.unclearTitle, body: strings.unclearBody });
    assert.deepEqual(getQualityGuidance(strings, 'no_visible_pixels'), getQualityGuidance(strings, undefined));
    assert.notEqual(strings.tooDarkBody, strings.tooBrightBody);
  }
}

function checkPythonParity() {
  const fixturePath = path.join(__dirname, 'runs/brightness_v1/parity/fixtures.json');
  if (!fs.existsSync(fixturePath)) return;
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  for (const fixture of fixtures) {
    const image = decodeExposurePng(fs.readFileSync(path.join(path.dirname(fixturePath), fixture.file)));
    const actual = quality.measureExposure(image);
    assert.ok(Math.abs(actual.meanLuminance - fixture.meanLuminance) < 1e-6, fixture.file);
    assert.ok(Math.abs(actual.highlightFraction - fixture.highlightFraction) < 1e-8, fixture.file);
    assert.ok(Math.abs(actual.visibleWeight - fixture.visibleWeight) < 1e-6, fixture.file);
    assert.equal(quality.exposureIssue(actual) ?? 'acceptable', fixture.issue, fixture.file);
  }
  console.log(`${fixtures.length} real/synthetic PNG fixtures match independent Python exposure calculations.`);
}

async function checkPngFormats() {
  const { encode } = await import('../mobile/node_modules/fast-png/lib/index.js');
  for (const channels of [1, 2, 3, 4]) {
    for (const depth of [8, 16]) {
      const max = depth === 16 ? 65535 : 255;
      const ArrayType = depth === 16 ? Uint16Array : Uint8Array;
      const data = new ArrayType(pixels * channels).fill(depth === 16 ? 25700 : 100);
      if (channels % 2 === 0) {
        for (let p = 0; p < pixels; p++) data[p * channels + channels - 1] = max;
      }
      const decoded = decodeExposurePng(encode({ width: 224, height: 224, channels, depth, data }));
      assert.equal(decoded.rgb[0], 100);
      assert.equal(decoded.alpha[0], 255);
      assert.equal(quality.measureExposure(decoded).meanLuminance, 100);
    }
  }
  assert.throws(() => decodeExposurePng(new Uint8Array([1, 2, 3])));
}

function buildClassifierMock() {
  const mockPath = path.join(output, 'imageManipulatorMock.cjs');
  fs.writeFileSync(mockPath, `
    exports.SaveFormat = { JPEG: 'jpeg', PNG: 'png' };
    exports.ImageManipulator = { manipulate() {
      return { resize() { return this; }, crop() { return this; }, async renderAsync() {
        return { async saveAsync(options) { return { base64: globalThis.brightnessTestImages[options.format] }; } };
      } };
    } };
  `);
  const destination = path.join(output, 'classifyLeaf.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '../mobile/src/diagnosis/classifyLeaf.ts')],
    bundle: true, platform: 'node', format: 'cjs', outfile: destination,
    alias: { 'expo-image-manipulator': mockPath },
  });
  return require(destination).classifyLeaf;
}

async function checkClassifierIntegration() {
  const classifyLeaf = buildClassifierMock();
  const { encode } = await import('../mobile/node_modules/fast-png/lib/index.js');
  const jpeg = require('../mobile/node_modules/jpeg-js');
  const { rgbaToRgbFloatTensor } = require(path.join(output, 'diagnosis/photoPixels.cjs'));
  for (const [value, issue] of [[1, 'too_dark'], [100, undefined], [254, 'too_bright']]) {
    const data = Uint8Array.from({ length: pixels * 4 }, (_, i) => i % 4 === 3 ? 255 : value + Math.floor(i / 4) % 2);
    const jpegBytes = jpeg.encode({ width: 224, height: 224, data }, 100).data;
    globalThis.brightnessTestImages = {
      jpeg: jpegBytes.toString('base64'),
      png: Buffer.from(encode({ width: 224, height: 224, channels: 4, data })).toString('base64'),
    };
    const expectedInput = rgbaToRgbFloatTensor(jpeg.decode(jpegBytes, { useTArray: true, formatAsRGBA: true }).data);
    const model = { async run([input]) {
      assert.deepEqual(new Float32Array(input), expectedInput);
      return [Float32Array.from([0, 0, 0, 0, 1, 0, 0, 0]).buffer];
    } };
    const diagnosis = await classifyLeaf(model, { uri: 'test-photo', width: 224, height: 224 });
    assert.equal(diagnosis.qualityIssue, issue);
    assert.equal(diagnosis.confidence, issue ? 'unclear' : 'confident');
    assert.equal(diagnosis.condition, 'rust');
  }
  delete globalThis.brightnessTestImages;
}

async function main() {
  checkExposureDecisions();
  checkTransparency();
  checkMessages();
  checkPythonParity();
  await checkPngFormats();
  await checkClassifierIntegration();
  console.log('Brightness direction, boundaries, clipping, transparency, PNG decoding, classifier integration and English/Swahili guidance passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
