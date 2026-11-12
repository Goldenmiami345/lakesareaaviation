import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapModelRegs, mapModelUrl, bankFor } from './map-models';

test('map 3D stays off unless the switch is explicitly on', () => {
  for (const v of [undefined, null, false, 'true', 1]) assert.equal(mapModelRegs(v, ['N8570B']).size, 0);
  assert.deepEqual([...mapModelRegs(true, ['N8570B', 'N4383P', 'N46201'])].sort(), ['N4383P', 'N46201', 'N8570B']);
});
test('each airplane can be turned off on its own', () => {
  assert.deepEqual([...mapModelRegs(true, ['N4383P'])], ['N4383P']);
  assert.equal(mapModelRegs(true, []).size, 0);
});
test('only airplanes that have a 3D model are accepted', () => {
  assert.deepEqual([...mapModelRegs(true, ['N7108G', 'N46201'])], ['N46201']);
  assert.equal(mapModelUrl('N7108G'), null);
  assert.match(mapModelUrl('N46201') ?? '', /^\/models\/map\/N46201\.glb\?/);
});
test('turns bank toward the turn and are capped', () => {
  assert.equal(bankFor(0), 0);
  assert.ok(bankFor(3) > 0 && bankFor(-3) < 0);
  assert.ok(Math.abs(bankFor(90)) <= (35 * Math.PI) / 180 + 1e-9);
});
