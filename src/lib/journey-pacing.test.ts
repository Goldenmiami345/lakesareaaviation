import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { journeyFrame, journeyLanding, journeyNearestLanding, JOURNEY_HOLD, JOURNEY_STAGE_SVH , journeyStop } from "./journey-pacing";

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


test("first journey page rests at the top of the section; later pages at their landings", () => {
  assert.equal(journeyStop(0, 6), 0);
  for (let i = 1; i < 6; i += 1) assert.equal(journeyStop(i, 6), journeyLanding(i, 6));
});
