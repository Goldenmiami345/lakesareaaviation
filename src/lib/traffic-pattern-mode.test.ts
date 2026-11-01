import { describe, it, expect } from 'vitest';
import { PATTERN_PULSE } from '../components/traffic-path';
describe('drawn traffic pattern pulse', () => {
  it('fades in every 6–8 s, holds ~3 s, 600 ms fades', () => {
    expect(PATTERN_PULSE.minGapMs).toBe(6000);
    expect(PATTERN_PULSE.maxGapMs).toBe(8000);
    expect(PATTERN_PULSE.holdMs).toBe(3000);
    expect(PATTERN_PULSE.fadeMs).toBe(600);
  });
});
