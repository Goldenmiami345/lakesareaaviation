import { test } from "node:test";
import assert from "node:assert/strict";
import { patternAltitude, patternWaypoints, samplePattern } from "./traffic-pattern";
import { airportTraffic } from "./site-data";

test("pattern altitude is FAA field elevation plus pattern height", () => {
  assert.equal(patternAltitude(airportTraffic.KLXL), 2123);
  assert.equal(patternAltitude(airportTraffic["18V"]), 5965);
  assert.equal(patternAltitude(airportTraffic.P52), 4360);
});

test("downwind is flown at pattern altitude", () => {
  for (const a of Object.values(airportTraffic)) {
    const downwind = patternWaypoints(a).filter((p) => p.phase === "Downwind");
    for (const p of downwind) assert.equal(a.elevation + p.agl, patternAltitude(a));
  }
});

test("KLXL runway 13 uses left traffic (downwind on the northeast side)", () => {
  const a = airportTraffic.KLXL;
  const cross = patternWaypoints(a).find((p) => p.phase === "Crosswind")!;
  const rx = a.end.x - a.threshold.x, ry = a.end.y - a.threshold.y;
  // Cross product sign in y-down image space: negative means left of travel.
  assert.ok(rx * (cross.y - a.threshold.y) - ry * (cross.x - a.threshold.x) < 0);
  assert.ok(cross.y < a.end.y);
});

test("aircraft are on the ground at the touch-and-go point", () => {
  const s = samplePattern(airportTraffic.KLXL, 0);
  assert.equal(s.agl, 0);
  assert.equal(s.msl, airportTraffic.KLXL.elevation);
});
