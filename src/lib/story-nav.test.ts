import { describe, expect, it } from "vitest";
import { storyStep } from "./story-nav";
import { parseMobileJourneyMode } from "./use-site-settings";

describe("story mode", () => {
  it("forward moves one stage", () => expect(storyStep(0, 6, 1)).toBe(1));
  it("forward on the last stage exits to the next section", () => expect(storyStep(5, 6, 1)).toBe("exit"));
  it("back on the first stage stays", () => expect(storyStep(0, 6, -1)).toBe(0));
  it("unknown setting defaults to the scroll version", () => { expect(parseMobileJourneyMode(undefined)).toBe("scroll"); expect(parseMobileJourneyMode("story")).toBe("story"); });
});
