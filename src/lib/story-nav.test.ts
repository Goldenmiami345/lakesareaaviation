import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { storyStep, parseMobileJourneyMode } from "./story-nav";

describe("story mode", () => {
  it("forward moves one stage", () => assert.equal(storyStep(0, 6, 1), 1));
  it("forward on the last stage exits to the next section", () => assert.equal(storyStep(5, 6, 1), "exit"));
  it("back on the first stage stays", () => assert.equal(storyStep(0, 6, -1), 0));
  it("unknown setting defaults to the scroll version", () => { assert.equal(parseMobileJourneyMode(undefined), "scroll"); assert.equal(parseMobileJourneyMode("story"), "story"); });
});
