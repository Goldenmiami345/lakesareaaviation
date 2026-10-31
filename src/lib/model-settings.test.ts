import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_SETTINGS, MODEL_WINGSPANS_M, trafficPresentationScale } from './model-settings';
test('supplied aircraft use exact meter wingspans', () => {
  assert.deepEqual(MODEL_WINGSPANS_M, { N4383P: 11.28, N8570B: 10.97, N46201: 11.02 });
  for(const reg of Object.keys(MODEL_WINGSPANS_M)) assert.equal(trafficPresentationScale(reg),1);
  assert.equal(trafficPresentationScale('N6641F'),3);
});
test('viewer clamps the requested polar range and uses the requested camera', () => {
  assert.equal(MODEL_SETTINGS['min-camera-orbit'], 'auto 20deg auto');
  assert.equal(MODEL_SETTINGS['max-camera-orbit'], 'auto 100deg auto');
  assert.equal(MODEL_SETTINGS['camera-orbit'], '35deg 75deg auto');
  assert.equal(MODEL_SETTINGS['field-of-view'], '30deg');
});
test('viewer uses requested rotation and lighting', () => {
  assert.equal(MODEL_SETTINGS['auto-rotate-delay'], 1500);
  assert.equal(MODEL_SETTINGS['rotation-per-second'], '12deg');
  assert.equal(MODEL_SETTINGS['shadow-intensity'], 0.8);
  assert.equal(MODEL_SETTINGS['shadow-softness'], 0.9);
  assert.equal(MODEL_SETTINGS.exposure, 1);
  assert.equal(MODEL_SETTINGS['environment-image'], 'neutral');
  assert.equal(MODEL_SETTINGS['tone-mapping'], 'commerce');
});