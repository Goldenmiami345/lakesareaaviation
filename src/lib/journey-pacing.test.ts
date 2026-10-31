import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { journeyFrame, journeyLanding, journeyNearestLanding, JOURNEY_HOLD, JOURNEY_STAGE_SVH, journeyStop, pageStep, nearestPage } from "./journey-pacing";

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

describe("one swipe = one page", () => {
  // hero, 2 stages (last holds to 3000), exit page.
  const pages = [{ y: 0 }, { y: 800 }, { y: 2000, hold: 3000 }, { y: 3800 }];
  test("down from each page lands on exactly the next page", () => {
    assert.deepEqual(pageStep(pages, 0, 1), [{ y: 800, instant: false }]);
    assert.deepEqual(pageStep(pages, 800, 1), [{ y: 2000, instant: false }]);
    assert.deepEqual(pageStep(pages, 2000, 1), [{ y: 3000, instant: true }, { y: 3800, instant: false }]);
    assert.equal(pageStep(pages, 3800, 1), null);
  });
  test("up from each page lands on exactly the previous page, skipping dead length", () => {
    assert.deepEqual(pageStep(pages, 3800, -1), [{ y: 3000, instant: false }, { y: 2000, instant: true }]);
    assert.deepEqual(pageStep(pages, 2000, -1), [{ y: 800, instant: false }]);
    assert.deepEqual(pageStep(pages, 800, -1), [{ y: 0, instant: false }]);
    assert.equal(pageStep(pages, 0, -1), null);
  });
  test("between pages, a swipe goes to the neighbouring page in its direction", () => {
    assert.deepEqual(pageStep(pages, 400, 1), [{ y: 800, instant: false }]);
    assert.deepEqual(pageStep(pages, 400, -1), [{ y: 0, instant: false }]);
    assert.equal(nearestPage(pages, 2500), 2);
    assert.equal(nearestPage(pages, 3500), 3);
  });
});

test("section paging: one page inside a section, free scrolling at every section edge", async () => {
  const { sectionStep, nearestSectionPage } = await import("./journey-pacing");
  const pages = [{ y: 800, group: 0 }, { y: 1600, group: 0 }, { y: 2400, group: 0 }, { y: 4000, group: 1 }, { y: 4800, group: 1 }];
  assert.equal(sectionStep(pages, 800, 1), 1600);
  assert.equal(sectionStep(pages, 1600, -1), 800);
  assert.equal(sectionStep(pages, 800, -1), null); // up out of Discovery to the hero: free
  assert.equal(sectionStep(pages, 2400, 1), null); // down out of The Right Seat: free
  assert.equal(sectionStep(pages, 4000, -1), null); // up out of Little Falls: free
  assert.equal(sectionStep(pages, 4800, 1), null); // after Cottonwood: free
  assert.equal(sectionStep(pages, 400, 1), null); // halfway hero → Discovery: free
  assert.equal(sectionStep(pages, 3200, 1), null); // corridor between sections: free
  assert.equal(sectionStep(pages, 1000, 1), 1600);
  assert.equal(nearestSectionPage(pages, 3200), null);
  assert.equal(nearestSectionPage(pages, 1100), 800);
});
