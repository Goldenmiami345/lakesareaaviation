import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { WX_FIELDS, nearestStation, distanceNm } from "./wx-stations";

describe("nearest METAR station", () => {
  // Station coordinates as published by aviationweather.gov.
  const front = [{ id: "KDEN", lat: 39.8466, lon: -104.6562 }, { id: "KEIK", lat: 40.0103, lon: -105.0481 }, { id: "KLMO", lat: 40.1638, lon: -105.1634 }];
  test("Fort Lupton (18V) uses KDEN, the nearest reporting station", () => {
    assert.equal(nearestStation(WX_FIELDS["18V"], front)?.id, "KDEN");
  });
  test("Cottonwood (P52) prefers its own KP52 over KSEZ", () => {
    assert.equal(nearestStation(WX_FIELDS.P52, [{ id: "KSEZ", lat: 34.8486, lon: -111.7885 }, { id: "KP52", lat: 34.73, lon: -112.035 }])?.id, "KP52");
  });
  test("distance is in nautical miles", () => {
    assert.ok(Math.abs(distanceNm(0, 0, 1, 0) - 60) < 0.1);
  });
});
