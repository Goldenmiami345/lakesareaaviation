import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storyStep, parseMobileJourneyMode, storySwipeLimit, boundedStoryScroll } from "./story-nav";

describe("story mode", () => {
  it("forward moves one stage", () => assert.equal(storyStep(0, 6, 1), 1));
  it("forward on the last stage exits to the next section", () => assert.equal(storyStep(5, 6, 1), "exit"));
  it("back on the first stage stays", () => assert.equal(storyStep(0, 6, -1), 0));
  it("unknown setting defaults to the scroll version", () => { assert.equal(parseMobileJourneyMode(undefined), "scroll"); assert.equal(parseMobileJourneyMode("story"), "story"); });
  it("an incoming swipe stops on the first section even with excess momentum", () => {
    assert.equal(boundedStoryScroll(1800, storySwipeLimit(0, 725, 725)), 725);
  });
  it("a swipe inside the first section cannot pass its end", () => {
    assert.equal(boundedStoryScroll(2500, storySwipeLimit(725, 725, 725)), 1450);
  });
  it("a fresh swipe at the end can enter the next section", () => {
    assert.equal(boundedStoryScroll(2100, storySwipeLimit(1450, 725, 725)), 2100);
  });
  it("reversing a drag still follows the finger back below the boundary", () => {
    assert.equal(boundedStoryScroll(900, storySwipeLimit(725, 725, 725)), 900);
  });
  it("the second section also stops an incoming gesture at its start", () => {
    assert.equal(boundedStoryScroll(3000, storySwipeLimit(725, 1450, 725)), 1450);
  });
});
