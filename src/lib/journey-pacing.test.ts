import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { journeyFrame, journeyGestureTarget, journeyLanding, journeyNearestLanding, JOURNEY_HOLD, JOURNEY_STAGE_SVH } from "./journey-pacing";

describe("homepage journey pacing", () => {
  test("a viewport-sized swipe stays on the current reading step in either journey", () => {
    for (const count of [3, 6]) {
      const progress = 100 / (count * JOURNEY_STAGE_SVH);
      const state = journeyFrame(progress, count);
      assert.equal(state.active, 0);
      assert.equal(state.transition, 0);
    }
  });

  test("each navigation destination stays readable after another viewport of scrolling", () => {
    for (const count of [3, 6]) {
      for (let index = 0; index < count; index += 1) {
        const landing = journeyLanding(index, count);
        const state = journeyFrame(landing + 100 / (count * JOURNEY_STAGE_SVH), count);
        assert.equal(state.active, index);
        assert.ok(state.copyOpacity > 0.8);
      }
    }
  });

  test("transitions still complete and the last step remains accessible", () => {
    for (const count of [3, 6]) {
      assert.ok(journeyFrame(JOURNEY_HOLD / count, count).transition < 0.00001);
      assert.equal(journeyFrame(0.99 / count, count).active, 1);
      assert.equal(journeyFrame(1, count).active, count - 1);
    }
  });

  test("one gesture lands on exactly the next or previous stage, never skipping", () => {
    for (const count of [3, 6]) {
      for (let index = 0; index < count; index += 1) {
        const landing = journeyLanding(index, count);
        assert.equal(journeyGestureTarget(landing, count, 1), index + 1 < count ? index + 1 : null);
        assert.equal(journeyGestureTarget(landing, count, -1), index - 1 >= 0 ? index - 1 : null);
        // Mid-window swipes still advance a single stage.
        const mid = landing + 0.5 / count;
        assert.equal(journeyGestureTarget(mid, count, 1), index + 1 < count ? index + 1 : null);
        assert.equal(journeyGestureTarget(mid, count, -1), index);
      }
    }
  });

  test("gestures at the journey edges hand control back to native scrolling", () => {
    assert.equal(journeyGestureTarget(0, 6, -1), null);
    assert.equal(journeyGestureTarget(0.01, 6, 1), 0);
    assert.equal(journeyGestureTarget(1, 6, 1), null);
    assert.equal(journeyGestureTarget(0.99, 6, -1), 5);
  });

  test("momentum catch-up snaps to the nearest stage landing", () => {
    for (const count of [3, 6]) {
      assert.equal(journeyNearestLanding(0, count), 0);
      assert.equal(journeyNearestLanding(1, count), count - 1);
      for (let index = 0; index < count; index += 1) {
        const landing = journeyLanding(index, count);
        assert.equal(journeyNearestLanding(landing, count), index);
        if (index + 1 < count) {
          const next = journeyLanding(index + 1, count);
          assert.equal(journeyNearestLanding((landing + next) / 2 + 1e-6, count), index + 1);
          assert.equal(journeyNearestLanding((landing + next) / 2 - 1e-6, count), index);
        }
      }
    }
  });
});
