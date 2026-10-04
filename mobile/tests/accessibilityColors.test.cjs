/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const colors = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/colors.json'), 'utf8'));

function relativeLuminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => channel / 255);
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

const normalTextPairs = [
  ['ink', 'paper'],
  ['ink', 'surface'],
  ['ink-muted', 'paper'],
  ['ink-muted', 'surface'],
  ['accent', 'paper'],
  ['accent', 'surface'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-pressed'],
  ['healthy', 'healthy-soft'],
  ['watch', 'watch-soft'],
  ['sick', 'sick-soft'],
];

test('normal text and status pairs meet AAA contrast', () => {
  for (const [foreground, background] of normalTextPairs) {
    const ratio = contrastRatio(colors[foreground], colors[background]);
    assert.ok(ratio >= 7, `${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
  }
});

test('text field boundary is visible against its surface', () => {
  assert.ok(contrastRatio(colors['field-border'], colors.surface) >= 3);
});
