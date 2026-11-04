import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { patternTraffic, trackerUrl, deadReckon, type LiveAircraft } from "./live-traffic";
import { spriteFrame } from "./oblique-sprites";
import { KLXL_OBLIQUE_PATTERN } from "./oblique-view";
import { OBLIQUE_PATTERN_PULSE } from "../components/traffic-path";
import { ringRadius } from "../components/traffic-ui";

const base = { kt: 90, bearing: 0, lat: 45.95, lon: -94.35, track: 0 };
describe("Private Pilot live traffic", () => {
  test("live view only for aircraft within 4 nm and below 3,000 ft AGL", () => {
    const list: LiveAircraft[] = [
      { ...base, id: "IN", altFt: 2100, distNm: 2 },
      { ...base, id: "FAR", altFt: 2100, distNm: 6 },
      { ...base, id: "HIGH", altFt: 1123 + 3500, distNm: 1 },
    ];
    assert.deepEqual(patternTraffic(list, 1123).map((a) => a.id), ["IN"]);
    assert.deepEqual(patternTraffic(null, 1123), []);
  });
  test("non-school aircraft link to their tracker page by ICAO hex", () => {
    assert.equal(trackerUrl({ id: "N512SR", hex: "a6b1f0" }), "https://globe.adsb.lol/?icao=a6b1f0");
  });
  test("dead reckoning is capped at 30 seconds", () => {
    const a = { lat: 45.95, lon: -94.35, kt: 100, track: 0 };
    assert.equal(deadReckon(a, 120).lat, deadReckon(a, 30).lat);
  });
  test("simulated pattern flies our three 3D-modelled airplanes", () => {
    assert.deepEqual([...KLXL_OBLIQUE_PATTERN.aircraft], ["N8570B", "N4383P", "N46201"]);
  });
  test("target ring is always bigger than the airplane (1.6x span), min 11 px radius", () => {
    assert.equal(ringRadius(4), 11);
    assert.equal(ringRadius(30), 24);
    assert.ok(ringRadius(30) * 2 > 30);
  });
  test("pattern line shows ~2.5 s roughly every 15–20 s", () => {
    assert.equal(OBLIQUE_PATTERN_PULSE.minGapMs, 15000);
    assert.equal(OBLIQUE_PATTERN_PULSE.maxGapMs, 20000);
    assert.equal(OBLIQUE_PATTERN_PULSE.holdMs, 2500);
  });
  test("sprite frame follows heading relative to line of sight", () => {
    assert.equal(spriteFrame(6, 6), 0);
    assert.equal(spriteFrame(96, 6), 9);
    assert.equal(spriteFrame(0, 10), 35);
  });
});
