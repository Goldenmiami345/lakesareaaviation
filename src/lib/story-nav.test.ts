import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storyPeek, STORY_PEEK_TURN, storyStep, parseMobileJourneyMode, STORY_SWIPE_HINT_MS, STORY_TAP_HINT_MS, STORY_HINT_TOTAL_MS } from "./story-nav";

describe("story mode", () => {
  it("shows the swipe cue for one second", () => assert.equal(STORY_SWIPE_HINT_MS, 1000));
  it("keeps both first-arrival hints under three seconds", () => { assert.equal(STORY_TAP_HINT_MS, 1000); assert.equal(STORY_HINT_TOTAL_MS, 2000); });
  it("forward moves one stage", () => assert.equal(storyStep(0, 6, 1), 1));
  it("forward on the last stage exits to the next section", () => assert.equal(storyStep(5, 6, 1), "exit"));
  it("back on the first stage returns to the previous section", () => assert.equal(storyStep(0, 6, -1), "back"));
  it("back moves one stage", () => assert.equal(storyStep(3, 6, -1), 2));
  it("swipe-cue page turn starts and ends flat", () => { assert.equal(storyPeek(0), 0); assert.equal(storyPeek(0.95), 0); assert.equal(storyPeek(1), 0); });
  it("swipe-cue page turn stays slight", () => { assert.ok(STORY_PEEK_TURN <= 0.15); assert.ok(Math.abs(storyPeek(0.525) - STORY_PEEK_TURN) < 1e-9); });
  it("unknown setting defaults to the scroll version", () => { assert.equal(parseMobileJourneyMode(undefined), "scroll"); assert.equal(parseMobileJourneyMode("story"), "story"); });
});
