import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { journeyFrame, journeyLanding, journeyNearestLanding, JOURNEY_HOLD, JOURNEY_STAGE_SVH, journeyStop, stageStopFraction, pageStep, nearestPage } from "./journey-pacing";

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
  assert.equal(sectionStep(pages, 1600, -1), null); // upward is always linear
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

describe("one gesture = one stop", async () => {
  const { nextStopDown, stackProgress, stackOffset, stageStopFraction, isModeSwitchPoint, resolveMode } = await import("./journey-pacing");
  // Two journeys: stages, exit of the first = start of the second, then the second's exit.
  const stops = [900, 1700, 2500, 3300, 4100, 4900, 5700, 6500, 7300];
  test("from every stop the next stop down is exactly the following stop", () => {
    stops.forEach((s, i) => assert.equal(nextStopDown(stops, s), stops[i + 1] ?? null));
  });
  test("from mid-points and near-misses it is the next stop strictly below", () => {
    for (let i = 0; i < stops.length - 1; i += 1) {
      assert.equal(nextStopDown(stops, (stops[i]! + stops[i + 1]!) / 2), stops[i + 1]);
      assert.equal(nextStopDown(stops, stops[i]! + 1.5), stops[i + 1]); // within tolerance = on the stop
      assert.equal(nextStopDown(stops, stops[i + 1]! - 3), stops[i + 1]);
    }
    assert.equal(nextStopDown(stops, 100), 900);
  });
  test("stack mode puts the active stage at 0% on every stop", () => {
    for (const n of [3, 6]) for (let k = 0; k < n; k += 1) {
      const p = stackProgress(stageStopFraction(k, n), n);
      assert.ok(Math.abs(p - k) < 1e-9);
      assert.ok(Math.abs(stackOffset(k, p)) < 1e-9);
      if (k > 0) assert.ok(Math.abs(stackOffset(k - 1, p) + 1) < 1e-9); // previous page stacked a full screen above
    }
    const mid = stackProgress((stageStopFraction(1, 6) + stageStopFraction(2, 6)) / 2, 6);
    assert.ok(Math.abs(mid - 1.5) < 1e-9);
  });
  test("mode switches only at stops (or outside the pinned stretch)", () => {
    const stage = [1000, 1800, 2600];
    assert.equal(resolveMode("fade", "stack", isModeSwitchPoint(stage, 1800)), "stack");
    assert.equal(resolveMode("fade", "stack", isModeSwitchPoint(stage, 1801.5)), "stack");
    assert.equal(resolveMode("stack", "fade", isModeSwitchPoint(stage, 1400)), "stack");
    assert.equal(resolveMode("fade", "stack", isModeSwitchPoint(stage, 2200)), "fade");
    assert.equal(resolveMode("stack", "fade", isModeSwitchPoint(stage, 400)), "fade");
    assert.equal(resolveMode("stack", "fade", isModeSwitchPoint(stage, 3000)), "fade");
  });
});

test('native boundaries never page or settle; fully pinned partial entry pages only on input', async () => {
  const {pinnedStepDown}=await import('./journey-pacing');
  const stages=[800,1600,2400];
  assert.equal(pinnedStepDown(stages,799,800,2400),null);
  assert.equal(pinnedStepDown(stages,800,800,2400),1600);
  assert.equal(pinnedStepDown(stages,1100,800,2400),1600);
  assert.equal(pinnedStepDown(stages,2400,800,2400),null);
  assert.equal(pinnedStepDown(stages,2401,800,2400),null);
});

describe("desktop stops land fully faded in", () => {
  for (const vh of [640, 720, 800, 844, 900, 1024, 1080, 1200]) {
    for (const n of [6, 3]) {
      test(`every stop is a stage boundary at ${vh}px (${n} stages)`, () => {
        const total = (n * JOURNEY_STAGE_SVH * vh) / 100;
        for (let i = 0; i < n; i += 1) {
          const stop = Math.round(total * stageStopFraction(i, n));
          const f = journeyFrame(stop / total, n);
          assert.equal(f.stage, i);
          assert.equal(f.transition, 0);
          assert.equal(f.copyOpacity, 1);
        }
      });
    }
  }
});

import { journeyAltitude as _alt, journeyFrame as _jf, journeyLanding as _land } from "./journey-pacing";
describe("altitude readout", () => {
  it("rests on each stage's round target altitude", () => {
    const n = 6;
    expect([0, 1, 2, 3, 4, 5].map((i) => _alt(_jf(_land(i, n), n), n))).toEqual([0, 7000, 14000, 21000, 28000, 35000]);
  });
  it("counts only mid-transition", () => {
    const v = _alt(_jf((1 + 0.85) / 6, 6), 6);
    expect(v).toBeGreaterThan(7000); expect(v).toBeLessThan(14000);
  });
});
