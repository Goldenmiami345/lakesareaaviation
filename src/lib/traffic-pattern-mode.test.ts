import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_PULSE } from '../components/traffic-path';
describe('drawn traffic pattern pulse', () => {
  it('fades in every 6–8 s, holds ~3 s, 600 ms fades', () => {
    assert.equal(PATTERN_PULSE.minGapMs,6000);
    assert.equal(PATTERN_PULSE.maxGapMs,8000);
    assert.equal(PATTERN_PULSE.holdMs,3000);
    assert.equal(PATTERN_PULSE.fadeMs,600);
  });
});
