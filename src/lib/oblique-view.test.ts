import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, obliqueProject } from "./oblique-view";

describe("KLXL oblique projection", () => {
  test("runway 13 threshold lands on the painted threshold", () => {
    const p = obliqueProject(0, 0);
    assert.ok(Math.abs(p.x - KLXL_OBLIQUE.quad[0].x) < 1e-3);
    assert.ok(Math.abs(p.y - KLXL_OBLIQUE.quad[0].y) < 1e-3);
  });
  test("runway 31 threshold lands on the painted far end", () => {
    const p = obliqueProject(KLXL_OBLIQUE_PATTERN.end.x, 0);
    assert.ok(Math.abs(p.x - 1275) < 1e-3);
    assert.ok(Math.abs(p.y - 495) < 1e-3);
  });
  test("left traffic downwind sits on the far (hangar) side, above the runway in the photo", () => {
    const runwayMid = obliqueProject(500, 0);
    const downwindMid = obliqueProject(500, -KLXL_OBLIQUE_PATTERN.offset);
    assert.ok(downwindMid.y < runwayMid.y);
    assert.ok(downwindMid.scale < 1);
  });
  test("pattern altitude is 1,000 ft above the 1,123 ft field", () => {
    assert.equal(KLXL_OBLIQUE_PATTERN.elevation + KLXL_OBLIQUE_PATTERN.tpaAgl, 2123);
  });
});
