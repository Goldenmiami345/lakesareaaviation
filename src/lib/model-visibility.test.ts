import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelsEnabled } from './model-visibility';
import { aircraftModelUrl } from './aircraft-models';

test('3D stays off by default, while loading, and on invalid settings', () => {
  for (const value of [undefined, null, false, 'true', 1]) assert.equal(modelsEnabled(value), false);
  assert.equal(modelsEnabled(true), true);
});
test('no GLB URL is available without explicit enablement', () => {
  for (const reg of ['N46201', 'N4383P', 'N8570B']) {
    assert.equal(aircraftModelUrl(reg), null);
    assert.equal(aircraftModelUrl(reg, false), null);
    assert.match(aircraftModelUrl(reg, true) ?? '', /\.glb\?/);
  }
});