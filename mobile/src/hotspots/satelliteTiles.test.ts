import assert from 'node:assert/strict';
import test from 'node:test';

import { imageryZoom, tilesCovering } from './satelliteTiles.ts';

const FARM = { latitude: -0.4167, longitude: 36.95 };

test('the zoom is the sharpest imagery level that is not coarser than the map, capped at 19', () => {
  assert.equal(imageryZoom(0, 0.8), 18);
  assert.equal(imageryZoom(0, 0.5), 19);
  assert.equal(imageryZoom(0, 0.01), 19);
});

test('the tile under the map center is the standard web map tile for that point', () => {
  const view = { ...FARM, metersPerPixel: 0.8, width: 350, height: 360 };
  const middle = tilesCovering(view).find(
    (tile) => tile.x <= view.width / 2 && view.width / 2 < tile.x + tile.size && tile.y <= view.height / 2 && view.height / 2 < tile.y + tile.size,
  );
  assert.ok(middle);
  assert.ok(middle.url.endsWith('/tile/18/131375/157978'));
});

test('the tiles cover the whole map with no gaps at the edges', () => {
  const view = { ...FARM, metersPerPixel: 0.7, width: 350, height: 360 };
  const tiles = tilesCovering(view);
  assert.ok(Math.min(...tiles.map((tile) => tile.x)) <= 0);
  assert.ok(Math.min(...tiles.map((tile) => tile.y)) <= 0);
  assert.ok(Math.max(...tiles.map((tile) => tile.x + tile.size)) >= view.width);
  assert.ok(Math.max(...tiles.map((tile) => tile.y + tile.size)) >= view.height);
  assert.equal(new Set(tiles.map((tile) => tile.key)).size, tiles.length);
});
