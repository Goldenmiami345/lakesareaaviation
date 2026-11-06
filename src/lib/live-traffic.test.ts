import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { localTraffic, livePerformance, compass, visibleOnMap, patternTraffic, type LiveAircraft } from "./live-traffic";

const field = { lat: 45.9497, lon: -94.3473, elevation: 1123 };

describe("live traffic", () => {
  test("plots visible overflights without treating them as pattern traffic", () => {
    const overflight: LiveAircraft = { id: 'N461AS', altFt: 9800, kt: 115, distNm: 3.3, bearing: 0, lat: 40.1, lon: -104.7 };
    assert.deepEqual(visibleOnMap([overflight], () => ({ x: 200, y: 300 }), [0, 0, 1500, 1500]), [overflight]);
    assert.deepEqual(patternTraffic([overflight], 5000), []);
    assert.deepEqual(visibleOnMap([overflight], () => ({ x: 1600, y: 300 }), [0, 0, 1500, 1500]), []);
    assert.deepEqual(visibleOnMap([{ ...overflight, lat: undefined }], () => ({ x: 200, y: 300 }), [0, 0, 1500, 1500]), []);
  });
  test("keeps only airborne aircraft within 10 nm and below 6,000 ft AGL", () => {
    const rows = [
      { r: "N123AB", alt_baro: 2100, gs: 95, lat: 45.98, lon: -94.35 },
      { r: "N999JT", alt_baro: 35000, gs: 450, lat: 45.95, lon: -94.34 },
      { r: "N555FR", alt_baro: 3000, gs: 100, lat: 46.5, lon: -94.35 },
      { r: "N1G", alt_baro: "ground" as const, lat: 45.95, lon: -94.35 },
    ];
    const t = localTraffic(field, rows);
    assert.deepEqual(t.map((a) => a.id), ["N123AB"]);
    assert.equal(compass(t[0]!.bearing), "N");
  });
  test("hot day raises density altitude and cuts climb", () => {
    const p = livePerformance({ station: "KLXL", dir: 0, kt: 0, gust: null, obsTime: 0, raw: "", temp: 35, altim: 29.92 }, 1123)!;
    assert.ok(p.da > 3500);
    assert.ok(p.fpm < 560);
    assert.equal(livePerformance(null, 1123), null);
  });
});
