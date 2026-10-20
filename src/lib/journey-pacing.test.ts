import { describe, expect, test } from "bun:test";
import { journeyFrame, journeyLanding, JOURNEY_HOLD, JOURNEY_STAGE_SVH } from "./journey-pacing";

describe("homepage journey pacing", () => {
  test("a viewport-sized swipe stays on the current reading step in either journey", () => {
    for (const count of [3, 6]) {
      const progress = 100 / (count * JOURNEY_STAGE_SVH);
      const state = journeyFrame(progress, count);
      expect(state.active).toBe(0);
      expect(state.transition).toBe(0);
    }
  });

  test("each navigation destination stays readable after another viewport of scrolling", () => {
    for (const count of [3, 6]) {
      for (let index = 0; index < count; index += 1) {
        const landing = journeyLanding(index, count);
        const state = journeyFrame(landing + 100 / (count * JOURNEY_STAGE_SVH), count);
        expect(state.active).toBe(index);
        expect(state.copyOpacity).toBeGreaterThan(0.8);
      }
    }
  });

  test("transitions still complete and the last step remains accessible", () => {
    for (const count of [3, 6]) {
      expect(journeyFrame(JOURNEY_HOLD / count, count).transition).toBeCloseTo(0);
      expect(journeyFrame(0.99 / count, count).active).toBe(1);
      expect(journeyFrame(1, count).active).toBe(count - 1);
    }
  });
});