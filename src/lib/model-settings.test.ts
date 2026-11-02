import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_SETTINGS, MODEL_WINGSPANS_M, trafficPresentationScale, modelOrbitRadius } from './model-settings';
import { SHOW_3D_MODELS } from './site-data';
test('owner approved public model release', () => {
  assert.equal(SHOW_3D_MODELS, true);
});
test('supplied aircraft use exact meter wingspans', () => {
  assert.deepEqual(MODEL_WINGSPANS_M, { N4383P: 11.28, N8570B: 10.97, N46201: 11.02 });
  for(const reg of Object.keys(MODEL_WINGSPANS_M)) {
    assert.equal(trafficPresentationScale(reg, true),1);
    assert.equal(trafficPresentationScale(reg, false),3);
  }
  assert.equal(trafficPresentationScale('N6641F'),3);
});
test('viewer clamps the requested polar range and uses the requested camera', () => {
  assert.equal(MODEL_SETTINGS['min-camera-orbit'], 'auto 20deg auto');
  assert.equal(MODEL_SETTINGS['max-camera-orbit'], 'auto 100deg auto');
  assert.equal(MODEL_SETTINGS['camera-orbit'], '35deg 73deg auto');
  assert.equal(MODEL_SETTINGS['field-of-view'], '30deg');
});
test('camera radius contains the whole rotational envelope at fleet and traffic aspects', () => {
  for (const aspect of [4/3, 2.5, 2.7]) {
    const r=5.75,h=2.8,d=modelOrbitRadius(r,h,aspect,30),tan=Math.tan(Math.PI/12),phi=73*Math.PI/180;
    for(let i=0;i<720;i++) {
      const a=i*Math.PI/360;
      for(let j=-90;j<=90;j+=5) {
        const lat=j*Math.PI/180,x=r*Math.cos(a)*Math.cos(lat),z=r*Math.sin(a)*Math.cos(lat),y=h/2*Math.sin(lat);
        const depth=z*Math.sin(phi)+y*Math.cos(phi);
        assert.ok(Math.abs(x)/(d-depth)/tan/aspect <= .9801);
        assert.ok(Math.abs(y*Math.sin(phi)-z*Math.cos(phi))/(d-depth)/tan <= .90001);
      }
    }
  }
});
test('viewer uses requested rotation and lighting', () => {
  assert.equal(MODEL_SETTINGS['auto-rotate-delay'], 0);
  assert.equal(MODEL_SETTINGS['rotation-per-second'], '9deg');
  assert.equal(MODEL_SETTINGS['shadow-intensity'], 0.8);
  assert.equal(MODEL_SETTINGS['shadow-softness'], 0.9);
  assert.equal(MODEL_SETTINGS.exposure, 1);
  assert.equal(MODEL_SETTINGS['environment-image'], 'neutral');
  assert.equal(MODEL_SETTINGS['tone-mapping'], 'commerce');
});