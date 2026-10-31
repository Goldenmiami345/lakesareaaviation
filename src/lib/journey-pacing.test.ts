import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { journeyEase, journeyFrame, journeyGestureTarget, journeyLanding, journeyNearestLanding, journeyShouldSettle, journeyWheelStartsGesture, JOURNEY_HOLD, JOURNEY_STAGE_SVH } from "./journey-pacing";

describe("homepage journey pacing", () => {
  test("rounded mobile landings still advance one step and release both endpoints", () => {
    for (const count of [3, 6]) {
      for (let index = 0; index < count; index += 1) {
        for (const offset of [-0.001, 0.001]) {
          const progress = journeyLanding(index, count) + offset / count;
          assert.equal(journeyGestureTarget(progress, count, 1), index === count - 1 ? null : index + 1);
          assert.equal(journeyGestureTarget(progress, count, -1), index === 0 ? null : index - 1);
        }
      }
    }
  });

  test("settling never pulls visitors back from either exit corridor", () => {
    for (const count of [3, 6]) {
      assert.equal(journeyShouldSettle(0, count), false);
      assert.equal(journeyShouldSettle(journeyLanding(0, count), count), false);
      assert.equal(journeyShouldSettle(journeyLanding(count - 1, count), count), false);
      assert.equal(journeyShouldSettle(1, count), false);
      assert.equal(journeyShouldSettle(journeyLanding(1, count), count), true);
    }
  });
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

describe("journey wheel gestures", () => {
  test("decaying inertia after a step never triggers a second step", () => {
    let delta = 80;
    for (let t = 300; t < 1100; t += 16) {
      delta = Math.max(1, delta * 0.94);
      assert.equal(journeyWheelStartsGesture({ gapMs: 16, delta, lastDelta: delta / 0.94, sinceStepMs: t }), false);
    }
  });

  test("a fresh flick after the glide starts a new step immediately", () => {
    assert.equal(journeyWheelStartsGesture({ gapMs: 16, delta: 60, lastDelta: 4, sinceStepMs: 400 }), true);
    assert.equal(journeyWheelStartsGesture({ gapMs: 250, delta: 5, lastDelta: 5, sinceStepMs: 400 }), true);
  });

  test("a continuous spin keeps advancing instead of locking the page", () => {
    assert.equal(journeyWheelStartsGesture({ gapMs: 30, delta: 100, lastDelta: 100, sinceStepMs: 1200 }), true);
  });

  test("the glide eases from start to landing", () => {
    assert.equal(journeyEase(0), 0);
    assert.equal(journeyEase(1), 1);
    assert.ok(journeyEase(0.5) > 0.49 && journeyEase(0.5) < 0.51);
  });
});
