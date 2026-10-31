import { expect, test } from 'bun:test';
import { MODEL_SETTINGS, MODEL_WINGSPANS_M } from './model-settings';
test('supplied aircraft use exact meter wingspans', () => {
  expect(MODEL_WINGSPANS_M).toEqual({ N4383P: 11.28, N8570B: 10.97, N46201: 11.02 });
});
test('viewer clamps the requested polar range and uses the requested camera', () => {
  expect(MODEL_SETTINGS['min-camera-orbit']).toBe('auto 20deg auto');
  expect(MODEL_SETTINGS['max-camera-orbit']).toBe('auto 100deg auto');
  expect(MODEL_SETTINGS['camera-orbit']).toBe('35deg 75deg auto');
  expect(MODEL_SETTINGS['field-of-view']).toBe('30deg');
});
test('viewer uses requested rotation and lighting', () => {
  expect(MODEL_SETTINGS['auto-rotate-delay']).toBe(1500);
  expect(MODEL_SETTINGS['rotation-per-second']).toBe('12deg');
  expect(MODEL_SETTINGS['shadow-intensity']).toBe(0.8);
  expect(MODEL_SETTINGS['shadow-softness']).toBe(0.9);
  expect(MODEL_SETTINGS.exposure).toBe(1);
  expect(MODEL_SETTINGS['environment-image']).toBe('neutral');
  expect(MODEL_SETTINGS['tone-mapping']).toBe('commerce');
});