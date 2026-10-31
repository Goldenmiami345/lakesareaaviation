import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRunway, patternFor, positionReport, headwind } from "./traffic-pattern";
import { airportTraffic } from "./site-data";

test("calm-wind runway under 5 kt or with no weather", () => {
  assert.equal(pickRunway(airportTraffic.P52, { dir: 150, kt: 4 }).runway, "32");
  assert.equal(pickRunway(airportTraffic.KLXL, null).runway, "13");
});
test("variable wind uses the calm-wind runway", () => {
  assert.equal(pickRunway(airportTraffic["18V"], { dir: null, kt: 6 }).runway, "15");
});
test("best headwind end wins", () => {
  assert.equal(pickRunway(airportTraffic.KLXL, { dir: 320, kt: 10 }).runway, "31");
  assert.equal(pickRunway(airportTraffic.P52, { dir: 150, kt: 12 }).runway, "14");
  assert.ok(Math.abs(headwind({ dir: 131, kt: 10 }, 131) - 10) < 1e-9);
});
test("P52 runway 32 is right traffic, 14 left (FAA)", () => {
  const r32 = patternFor(airportTraffic.P52, pickRunway(airportTraffic.P52, null));
  assert.equal(r32.side, "right");
  assert.deepEqual(r32.threshold, airportTraffic.P52.end);
  assert.equal(patternFor(airportTraffic.P52, airportTraffic.P52.ends[0]).side, "left");
});
test("position reports carry runway and side", () => {
  assert.equal(positionReport("Downwind", "32", "right"), "Right downwind 32");
  assert.equal(positionReport("Takeoff", "13", "left"), "Departing runway 13");
  assert.equal(positionReport("Upwind", "13", "left"), null);
});
