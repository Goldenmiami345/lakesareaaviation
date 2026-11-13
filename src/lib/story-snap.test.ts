import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storySnapWanted, nearestSnap, storyOpeningSettled, inFinalStretch, stretchSettleTarget } from "./story-snap";

describe("story snap", () => {
  it("opening lock waits for fonts and a still page", () => { assert.equal(storyOpeningSettled(5, false), false); assert.equal(storyOpeningSettled(1, true), false); assert.equal(storyOpeningSettled(2, true), true); });
  it("snapping is on inside the story sections", () => assert.equal(storySnapWanted(725, 2175, false), true));
  it("snapping is off in the reading content below the sections", () => assert.equal(storySnapWanted(3000, 2175, true), false));
  it("on the last boundary, scrolling on into the content stays free", () => assert.equal(storySnapWanted(2175, 2175, false), false));
  it("on the last boundary, heading back up locks to the sections", () => assert.equal(storySnapWanted(2175, 2175, true), true));
  it("a drag starting mid-glide into the content, or resting on its top, decides by direction", () => {
    assert.equal(inFinalStretch(2100, 1450, 2175), true);
    assert.equal(inFinalStretch(2175, 1450, 2175), true);
  });
  it("a drag starting on the Locations section decides by direction too", () => assert.equal(inFinalStretch(1450, 1450, 2175), true));
  it("a drag starting on the Flight Path section above keeps the one-section lock", () => assert.equal(inFinalStretch(725, 1450, 2175), false));
  it("one gentle swipe down from Locations carries on into the content instead of flipping back", () => assert.equal(stretchSettleTarget(1750, 1450, 2175, true), 2175));
  it("one gentle swipe up from the content carries on back to Locations instead of flipping back", () => assert.equal(stretchSettleTarget(1900, 1450, 2175, false), 1450));
  it("a tiny accidental nudge returns to where it started", () => {
    assert.equal(stretchSettleTarget(1460, 1450, 2175, true), 1450);
    assert.equal(stretchSettleTarget(2165, 1450, 2175, false), 2175);
  });
  it("a drag starting in the reading content is not the final stretch", () => assert.equal(inFinalStretch(2600, 1450, 2175), false));
  it("a rest between sections settles to the nearer section", () => {
    assert.equal(nearestSnap(1000, [0, 725, 1450, 2175]), 725);
    assert.equal(nearestSnap(1200, [0, 725, 1450, 2175]), 1450);
  });
});
