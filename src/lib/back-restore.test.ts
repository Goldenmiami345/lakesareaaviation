import { describe, expect, it } from "vitest";
import { anchorPosition, restoreTarget, trimEntries } from "./back-restore";

describe("back-button return position", () => {
  it("saves the spot relative to the section the visitor was on", () => {
    expect(anchorPosition(2400, [0, 800, 1600, 2400, 3200])).toEqual({ i: 3, off: 0 });
    expect(anchorPosition(3500, [0, 800, 1600, 2400, 3200])).toEqual({ i: 4, off: 300 });
  });
  it("returns to the same section even if sections moved since", () => {
    expect(restoreTarget({ y: 2400, i: 3, off: 0 }, [0, 812, 1624, 2436], 9000)).toBe(2436);
  });
  it("uses the raw scroll position on pages without sections", () => {
    expect(restoreTarget({ y: 1234, i: -1, off: 1234 }, [], 5000)).toBe(1234);
    expect(restoreTarget({ y: 1234, i: -1, off: 1234 }, [], 900)).toBe(900);
  });
  it("keeps only the newest 40 history entries", () => {
    const s: Record<string, number> = {};
    for (let k = 0; k < 45; k++) s[`k${k}`] = k;
    const t = trimEntries(s);
    expect(Object.keys(t)).toHaveLength(40);
    expect(t.k0).toBeUndefined();
    expect(t.k44).toBe(44);
  });
});
