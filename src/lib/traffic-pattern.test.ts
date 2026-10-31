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

import { lapSeconds, feetPerPixel } from "./traffic-pattern";
test("pattern circuits take real-world minutes, not seconds", () => {
  const a = airportTraffic.KLXL;
  assert.ok(Math.abs(feetPerPixel(a) - 4010 / Math.hypot(905 - 595, 883 - 617)) < 1e-6);
  const lap = lapSeconds(a);
  assert.ok(lap > 60 && lap < 300);
});

test("every airport shows 3–4 fleet aircraft", () => {
  for (const a of Object.values(airportTraffic)) assert.ok(a.aircraft.length >= 3 && a.aircraft.length <= 4, a.ident);
});

test("patterns are 50% tighter: downwind KLXL 1,235 ft, 18V 1,650 ft, P52 1,461 ft (±3%)", () => {
  const want: Record<string, number> = { KLXL: 1235, "18V": 1650, P52: 1461 };
  for (const a of Object.values(airportTraffic)) assert.ok(Math.abs(a.offset * feetPerPixel(a) - want[a.ident]!) / want[a.ident]! < 0.03, a.ident);
});

test("runway midpoint is centred in each aerial (within 40 px of 750,750)", () => {
  for (const a of Object.values(airportTraffic)) {
    assert.ok(Math.abs((a.threshold.x + a.end.x) / 2 - 750) < 40 && Math.abs((a.threshold.y + a.end.y) / 2 - 750) < 40, a.ident);
  }
});

