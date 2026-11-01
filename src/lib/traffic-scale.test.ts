import { describe, it, expect } from 'bun:test';
import { trafficModelScale, trafficSpanFeet } from '../components/traffic-vector';
describe('photo airplanes share the vector display scale', () => {
  it('uses 3x for photo renders and vectors alike', () => {
    for (const r of ['N4383P','N8570B','N46201']) expect(trafficModelScale(r,true)).toBe(3);
    expect(trafficModelScale('N6717A')).toBe(3);
  });
  it('photo 172 matches a vector 172 within 1 ft of span', () => {
    expect(Math.abs(trafficSpanFeet('N8570B',true)-trafficSpanFeet('N6717A'))).toBeLessThan(1);
  });
});
