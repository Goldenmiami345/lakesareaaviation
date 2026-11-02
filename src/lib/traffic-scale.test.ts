import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trafficModelScale, trafficSpanFeet } from '../components/traffic-vector';
describe('photo airplanes share the vector display scale', () => {
  it('uses 3x for photo renders and vectors alike', () => {
    for (const r of ['N4383P','N8570B','N46201']) assert.equal(trafficModelScale(r,true),3);
    assert.equal(trafficModelScale('N6717A'),3);
  });
  it('photo 172 matches a vector 172 within 1 ft of span', () => {
    assert.ok(Math.abs(trafficSpanFeet('N8570B',true)-trafficSpanFeet('N6717A'))<1);
  });
});
