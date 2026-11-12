import { describe, test as it } from "node:test";
import assert from "node:assert/strict";
import { anchorPosition, restoreTarget, trimEntries } from "./back-restore";

describe("back-button return position", () => {
  it("saves the spot relative to the section the visitor was on", () => {
    assert.deepEqual(anchorPosition(2400, [0, 800, 1600, 2400, 3200]), { i: 3, off: 0 });
    assert.deepEqual(anchorPosition(3500, [0, 800, 1600, 2400, 3200]), { i: 4, off: 300 });
  });
  it("returns to the same section even if sections moved since", () => {
    assert.equal(restoreTarget({ y: 2400, i: 3, off: 0 }, [0, 812, 1624, 2436], 9000), 2436);
  });
  it("uses the raw scroll position on pages without sections", () => {
    assert.equal(restoreTarget({ y: 1234, i: -1, off: 1234 }, [], 5000), 1234);
    assert.equal(restoreTarget({ y: 1234, i: -1, off: 1234 }, [], 900), 900);
  });
  it("keeps only the newest 40 history entries", () => {
    const s: Record<string, number> = {};
    for (let k = 0; k < 45; k++) s[`k${k}`] = k;
    const t = trimEntries(s);
    assert.equal(Object.keys(t).length, 40);
    assert.equal(t["k0"], undefined);
    assert.equal(t["k44"], 44);
  });
});
