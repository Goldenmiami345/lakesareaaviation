import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { KLXL_OBLIQUE_PATTERN, KLXL_RUNWAYS, obliqueProject, patternToGround, projectGround } from "./oblique-view";

const FT = 0.3048;
const dist = (a: { e: number; n: number }, b: { e: number; n: number }) => Math.hypot(a.e - b.e, a.n - b.n) / FT;

describe("KLXL runway geometry (FAA/AirNav end coordinates)", () => {
  test("runway 13/31 is 4,010 ft and runway 18/36 is 2,858 ft (±10 ft)", () => {
    assert.ok(Math.abs(dist(KLXL_RUNWAYS["13"], KLXL_RUNWAYS["31"]) - 4010) < 10);
    assert.ok(Math.abs(dist(KLXL_RUNWAYS["18"], KLXL_RUNWAYS["36"]) - 2858) < 10);
  });
  test("18/36 crosses 13/31 about 500 ft from the runway 13 end, with ~475 ft of 18/36 north of it", () => {
    const a = KLXL_RUNWAYS["13"], b = KLXL_RUNWAYS["31"], c = KLXL_RUNWAYS["18"], d = KLXL_RUNWAYS["36"];
    const den = (b.e - a.e) * (d.n - c.n) - (b.n - a.n) * (d.e - c.e);
    const t = ((c.e - a.e) * (d.n - c.n) - (c.n - a.n) * (d.e - c.e)) / den;
    const u = ((c.e - a.e) * (b.n - a.n) - (c.n - a.n) * (b.e - a.e)) / den;
    assert.ok(Math.abs(t * 4010 - 504) < 30);
    assert.ok(Math.abs(u * 2858 - 475) < 30);
  });
});

describe("KLXL oblique camera", () => {
  test("pattern frame puts the runway ends on the FAA coordinates", () => {
    const p0 = patternToGround(0, 0), p1 = patternToGround(KLXL_OBLIQUE_PATTERN.end.x, 0);
    assert.ok(dist(p0, KLXL_RUNWAYS["13"]) < 1);
    assert.ok(dist(p1, KLXL_RUNWAYS["31"]) < 1);
  });
  test("left traffic for runway 13 lies on the northeast (hangar) side", () => {
    const dw = patternToGround(500, -KLXL_OBLIQUE_PATTERN.offset);
    const mid = patternToGround(500, 0);
    assert.ok(dw.e > mid.e && dw.n > mid.n);
  });
  test("an airplane at pattern altitude draws higher in the picture than its shadow", () => {
    const air = obliqueProject(500, -KLXL_OBLIQUE_PATTERN.offset, 1000);
    const ground = obliqueProject(500, -KLXL_OBLIQUE_PATTERN.offset, 0);
    assert.ok(air.y < ground.y);
  });
  test("obliqueProject returns the exact camera depth used for clipping at 150 metres", () => {
    for (const [x, y, agl] of [[500, -616, 1000], [1200, 616, 1000]] as const) {
      const ground = patternToGround(x, y);
      const projected = projectGround(ground.e, ground.n, agl * FT);
      assert.equal(obliqueProject(x, y, agl).z, projected.z);
    }
  });
  test("both runway ends are inside the picture", () => {
    for (const k of ["13", "31", "18", "36"] as const) {
      const p = projectGround(KLXL_RUNWAYS[k].e, KLXL_RUNWAYS[k].n);
      assert.ok(p.x > 0 && p.x < 1376 && p.y > 0 && p.y < 768, k);
    }
  });
  test("pattern altitude is 1,000 ft above the 1,123 ft field", () => {
    assert.equal(KLXL_OBLIQUE_PATTERN.elevation + KLXL_OBLIQUE_PATTERN.tpaAgl, 2123);
  });
});
