import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { JOURNEY_HOLD, JOURNEY_TAIL, journeyFrame, journeyAltitude, maxSettleDistance, pinnedLength, settleTarget, stageLanding, stageLengthFrom, stagePosition } from "./journey-scroll";

const g = { base: 1000, stage: 800, count: 6 };
const at = (stageUnits: number) => g.base + stageUnits * g.stage;

describe("geometry", () => {
  it("pinned length and stage length are inverses", () => {
    const vh = 844;
    const section = pinnedLength(g.stage, g.count) + vh;
    assert.ok(Math.abs(stageLengthFrom(section, vh, g.count) - g.stage) < 1e-6);
  });
  it("clamps position to the pinned range", () => {
    assert.equal(stagePosition(g, g.base - 500), 0);
    assert.ok(Math.abs(stagePosition(g, at(99)) - (g.count - 1 + JOURNEY_TAIL)) < 1e-9);
  });
});

describe("journeyFrame", () => {
  it("shows a stage unchanged through its whole hold", () => {
    for (const k of [0, 1, 4]) {
      for (const f of [0, 0.25, JOURNEY_HOLD - 1e-6]) {
        const fr = journeyFrame(g, at(k + f));
        assert.equal(fr.stage, k);
        assert.equal(fr.transition, 0);
        assert.equal(fr.active, k);
        assert.equal(fr.copyOpacity, 1);
      }
    }
  });
  it("crossfades monotonically from hold end to the next stage", () => {
    let prev = -1;
    for (let f = JOURNEY_HOLD; f <= 1; f += 0.01) {
      const fr = journeyFrame(g, at(2 + f));
      assert.equal(fr.stage, 2);
      assert.ok(fr.transition >= prev);
      prev = fr.transition;
    }
    assert.ok(Math.abs(journeyFrame(g, at(2.9999)).transition - 1) < 1e-6);
    assert.equal(journeyFrame(g, at(3)).transition, 0);
    assert.equal(journeyFrame(g, at(3)).stage, 3);
  });
  it("switches the active stage at the midpoint of the crossfade", () => {
    const mid = JOURNEY_HOLD + (1 - JOURNEY_HOLD) / 2;
    assert.equal(journeyFrame(g, at(2 + mid - 0.01)).active, 2);
    assert.equal(journeyFrame(g, at(2 + mid + 0.01)).active, 3);
  });
  it("holds the last stage through the tail with no crossfade", () => {
    for (const f of [0, 0.5, JOURNEY_TAIL, 5]) {
      const fr = journeyFrame(g, at(g.count - 1 + f));
      assert.equal(fr.stage, g.count - 1);
      assert.equal(fr.transition, 0);
      assert.equal(fr.progress, 1);
    }
  });
  it("progress runs 0→1 across the stages", () => {
    assert.equal(journeyFrame(g, g.base).progress, 0);
    assert.ok(Math.abs(journeyFrame(g, at(2.5)).progress - 0.5) < 1e-9);
  });
  it("copes with a single-stage journey", () => {
    const fr = journeyFrame({ ...g, count: 1 }, at(0.5));
    assert.deepEqual({ stage: fr.stage, next: fr.next, transition: fr.transition, active: fr.active, progress: fr.progress }, { stage: 0, next: 0, transition: 0, active: 0, progress: 1 });
  });
});

describe("settleTarget", () => {
  it("never moves a rest position inside a hold (any swipe length that ends in a hold stands)", () => {
    for (const k of [0, 1, 2, 5]) for (const f of [0, 0.1, 0.5, JOURNEY_HOLD]) assert.equal(settleTarget(g, at(k + f)), null);
  });
  it("leaves the hero, the section edges and the tail alone", () => {
    assert.equal(settleTarget(g, g.base - 300), null);
    assert.equal(settleTarget(g, g.base), null);
    assert.equal(settleTarget(g, at(g.count - 1)), null);
    assert.equal(settleTarget(g, at(g.count - 1 + JOURNEY_TAIL / 2)), null);
    assert.equal(settleTarget(g, at(g.count + 3)), null);
    // Leaving a section either way is never pulled back in.
    for (const d of [1, 40, 300]) { assert.equal(settleTarget(g, g.base - d), null); assert.equal(settleTarget(g, at(g.count - 1 + JOURNEY_TAIL) + d), null); }
  });
  it("finishes a crossfade toward its nearer edge", () => {
    const w = 1 - JOURNEY_HOLD;
    assert.equal(settleTarget(g, at(1 + JOURNEY_HOLD + w * 0.2)), Math.round(at(1 + JOURNEY_HOLD)));
    assert.equal(settleTarget(g, at(1 + JOURNEY_HOLD + w * 0.8)), Math.round(at(2)));
  });
  it("never moves the page more than half a crossfade window", () => {
    const edge = 2 / g.stage;
    for (let f = JOURNEY_HOLD + edge; f < 1 - edge; f += 0.001) {
      const y = at(3 + f);
      const t = settleTarget(g, y);
      assert.notEqual(t, null);
      if (t === null) throw new Error("Expected a crossfade settle target");
      assert.ok(Math.abs(t - y) <= maxSettleDistance(g.stage) + 1);
    }
  });
  it("treats a position within a pixel of a window edge as at rest", () => {
    assert.equal(settleTarget(g, at(2 + JOURNEY_HOLD) + 0.5), null);
    assert.equal(settleTarget(g, at(3) - 0.5), null);
  });
  it("is idempotent: a settled position needs no further settling", () => {
    for (let f = JOURNEY_HOLD + 2 / g.stage; f < 1 - 2 / g.stage; f += 0.01) {
      const t = settleTarget(g, at(2 + f));
      if (t === null) throw new Error("Expected a crossfade settle target");
      assert.equal(settleTarget(g, t), null);
      assert.ok(journeyFrame(g, t).transition === 0 || journeyFrame(g, t).transition === 1);
    }
  });
});

describe("stageLanding", () => {
  it("lands in the middle of a hold so small wobbles change nothing", () => {
    for (let k = 0; k < g.count - 1; k += 1) {
      const y = stageLanding(g, k);
      for (const pos of [y, y - g.stage * 0.3, y + g.stage * 0.3]) {
        const fr = journeyFrame(g, pos);
        assert.equal(fr.stage, k);
        assert.equal(fr.transition, 0);
      }
    }
  });
  it("lands the last stage inside its tail", () => {
    const y = stageLanding(g, g.count - 1);
    const fr = journeyFrame(g, y);
    assert.equal(fr.stage, g.count - 1);
    assert.equal(fr.transition, 0);
    assert.ok(y > at(g.count - 1));
    assert.ok(y < at(g.count - 1 + JOURNEY_TAIL));
  });
  it("clamps out-of-range indexes", () => {
    assert.equal(stageLanding(g, -4), stageLanding(g, 0));
    assert.equal(stageLanding(g, 99), stageLanding(g, g.count - 1));
  });
});

describe("altitude", () => {
  it("rests on round thousands and counts only during a crossfade", () => {
    assert.equal(journeyAltitude(journeyFrame(g, at(0)), g.count), 0);
    assert.equal(journeyAltitude(journeyFrame(g, at(1)), g.count), 7000);
    assert.equal(journeyAltitude(journeyFrame(g, at(5)), g.count), 35000);
    const mid = journeyAltitude(journeyFrame(g, at(1 + JOURNEY_HOLD + (1 - JOURNEY_HOLD) / 2)), g.count);
    assert.ok(mid > 7000);
    assert.ok(mid < 14000);
  });
});