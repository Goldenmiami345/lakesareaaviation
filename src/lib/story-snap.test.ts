import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storySnapWanted, nearestSnap } from "./story-snap";

describe("story snap", () => {
  it("snapping is on inside the story sections", () => assert.equal(storySnapWanted(725, 2175, false), true));
  it("snapping is off in the reading content below the sections", () => assert.equal(storySnapWanted(3000, 2175, true), false));
  it("on the last boundary, scrolling on into the content stays free", () => assert.equal(storySnapWanted(2175, 2175, false), false));
  it("on the last boundary, heading back up locks to the sections", () => assert.equal(storySnapWanted(2175, 2175, true), true));
  it("a rest between sections settles to the nearer section", () => {
    assert.equal(nearestSnap(1000, [0, 725, 1450, 2175]), 725);
    assert.equal(nearestSnap(1200, [0, 725, 1450, 2175]), 1450);
  });
});
