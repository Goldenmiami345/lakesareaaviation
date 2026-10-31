import { describe, expect, test } from "bun:test";
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, obliqueProject } from "./oblique-view";

describe("KLXL oblique projection", () => {
  test("runway 13 threshold lands on the painted threshold", () => {
    const p = obliqueProject(0, 0);
    expect(p.x).toBeCloseTo(KLXL_OBLIQUE.quad[0].x, 3);
    expect(p.y).toBeCloseTo(KLXL_OBLIQUE.quad[0].y, 3);
  });
  test("runway 31 threshold lands on the painted far end", () => {
    const p = obliqueProject(KLXL_OBLIQUE_PATTERN.end.x, 0);
    expect(p.x).toBeCloseTo(1275, 3);
    expect(p.y).toBeCloseTo(495, 3);
  });
  test("left traffic downwind sits on the far (hangar) side, above the runway in the photo", () => {
    const runwayMid = obliqueProject(500, 0);
    const downwindMid = obliqueProject(500, -KLXL_OBLIQUE_PATTERN.offset);
    expect(downwindMid.y).toBeLessThan(runwayMid.y);
    expect(downwindMid.scale).toBeLessThan(1);
  });
  test("pattern altitude is 1,000 ft above the 1,123 ft field", () => {
    expect(KLXL_OBLIQUE_PATTERN.elevation + KLXL_OBLIQUE_PATTERN.tpaAgl).toBe(2123);
  });
});
