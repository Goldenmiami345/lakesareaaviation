import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storyStep, parseMobileJourneyMode, STORY_SWIPE_HINT_MS, STORY_TAP_HINT_MS, STORY_HINT_TOTAL_MS } from "./story-nav";

describe("story mode", () => {
  it("shows the swipe cue for one second", () => assert.equal(STORY_SWIPE_HINT_MS, 1000));
  it("keeps both first-arrival hints under three seconds", () => { assert.equal(STORY_TAP_HINT_MS, 1000); assert.equal(STORY_HINT_TOTAL_MS, 2000); });
  it("forward moves one stage", () => assert.equal(storyStep(0, 6, 1), 1));
  it("forward on the last stage exits to the next section", () => assert.equal(storyStep(5, 6, 1), "exit"));
  it("back on the first stage stays", () => assert.equal(storyStep(0, 6, -1), 0));
  it("unknown setting defaults to the scroll version", () => { assert.equal(parseMobileJourneyMode(undefined), "scroll"); assert.equal(parseMobileJourneyMode("story"), "story"); });
});
