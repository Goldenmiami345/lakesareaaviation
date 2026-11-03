import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crabAngle, densityAltitude, climbScale, flightCategory, patternMode, profileAirport, parseMetarRow, metarSummary, gustJitter, trafficConditions } from './wx-conditions';
import { liftoffFraction, climbOutShiftPx, makeFlightPlan, sampleFlight } from './traffic-flight';
import { airportTraffic } from './site-data';
import { patternFor, pickRunway } from './traffic-pattern';
import { TrafficSchedule, legOf, type Leg } from './traffic-sequence';

test('crab: 90 kt TAS, 20 kt direct crosswind ≈ 12.8°', () => {
  assert.ok(Math.abs(crabAngle(90, { dir: 90, kt: 20 }, 0) - 12.84) < 0.05);
  assert.ok(Math.abs(crabAngle(90, { dir: 270, kt: 20 }, 0) + 12.84) < 0.05);
  assert.equal(crabAngle(90, { dir: 0, kt: 20 }, 0), 0);
  assert.equal(crabAngle(90, { dir: null, kt: 20 }, 0), 0);
});
test('flight plan heading crabs into the wind while the track stays on the leg', () => {
  const a = airportTraffic.KLXL, plan = makeFlightPlan(a, 'N46201', { dir: 41, kt: 20 }, 131);
  const down = plan.segments.find((s) => s.phase === 'Downwind')!;
  const track = Math.atan2(down.q.y - down.p.y, down.q.x - down.p.x) * 180 / Math.PI + 90;
  assert.ok(Math.abs(Math.abs(down.heading - track) - Math.abs(crabAngle(85, { dir: 41, kt: 20 }, 311))) < 1e-6 && Math.abs(down.heading - track) > 10);
  const roll = plan.segments.find((s) => s.phase === 'Touch-and-go')!;
  assert.ok(Math.abs(roll.heading - (Math.atan2(roll.q.y - roll.p.y, roll.q.x - roll.p.x) * 180 / Math.PI + 90)) < 1e-9, 'no crab on the ground');
});
test('density altitude and climb scaling: −7%/1,000 ft above field, floor 50%', () => {
  assert.ok(Math.abs(densityAltitude(0, 15, 29.92)) < 1);
  const hot = densityAltitude(4965, 35, 30.0);
  assert.ok(hot > 8500 && hot < 9500, String(hot));
  assert.ok(Math.abs(climbScale(4965 + 2000, 4965) - 0.86) < 1e-9);
  assert.equal(climbScale(30000, 0), 0.5);
  assert.ok(climbScale(-2000, 0) > 1, 'cold days climb better');
  assert.ok(climbOutShiftPx(airportTraffic['18V'], 0.6) > 0 && climbOutShiftPx(airportTraffic['18V'], 1.1) < 0);
});
test('headwind shortens the roll, tailwind lengthens it; calm keeps the published 45%', () => {
  assert.equal(liftoffFraction(0), 0.45);
  assert.ok(liftoffFraction(15) < 0.45 && liftoffFraction(-8) > 0.45);
});
test('flight category and pattern mode', () => {
  assert.equal(flightCategory(null, 10), 'VFR');
  assert.equal(flightCategory(3000, 10), 'MVFR');
  assert.equal(flightCategory(900, 10), 'IFR');
  assert.equal(flightCategory(400, 10), 'LIFR');
  assert.equal(flightCategory(null, 4), 'MVFR');
  assert.deepEqual(['VFR', 'MVFR', 'IFR', 'LIFR'].map((c) => patternMode(c as never)), ['vfr', 'mvfr', 'ifr', 'ifr']);
  const a = airportTraffic.KLXL;
  assert.equal(profileAirport(a, 'mvfr').aircraft.length, 2);
  assert.ok(profileAirport(a, 'mvfr').offset < a.offset && profileAirport(a, 'mvfr').tpaAgl < a.tpaAgl);
  assert.equal(profileAirport(a, 'ifr').aircraft.length, 1);
});
test('gust jitter: ≤2°, base/final only, none on the ground or under 5 kt spread', () => {
  let max = 0; for (let t = 0; t < 20; t += 0.05) max = Math.max(max, Math.abs(gustJitter(20, 'Final', 300, t)));
  assert.ok(max <= 2 && max > 0.5);
  assert.equal(gustJitter(20, 'Downwind', 1000, 1), 0);
  assert.equal(gustJitter(20, 'Final', 0, 1), 0);
  assert.equal(gustJitter(5, 'Final', 300, 1), 0);
});
test('METAR parsing and summary', () => {
  const m = parseMetarRow({ icaoId: 'KLXL', obsTime: Date.UTC(2026, 10, 3, 21, 53) / 1000, temp: 7, dewp: 2, wdir: 160, wspd: 10, wgst: 16, visib: '10+', altim: 1016.6, clouds: [{ cover: 'BKN', base: 3500 }], rawOb: 'METAR KLXL 032153Z 16010G16KT 10SM BKN035 07/02 A3002' });
  assert.equal(m.cat, 'MVFR'); assert.equal(m.ceiling, 3500); assert.equal(m.altim, 30.02);
  assert.equal(metarSummary({ ...m, cat: 'VFR' }), 'KLXL 2153Z · 160°/10G16 · 7°C/2°C · 30.02 · 10SM · BKN035 · VFR');
  const c = trafficConditions(m, { elevation: 1123 }, '13');
  assert.equal(c.mode, 'mvfr'); assert.equal(c.gust, 6);
});

const EXCLUSIVE: ReadonlySet<Leg> = new Set(['final', 'runway', 'departure']);
for (const [cat, mode] of [['VFR', 'vfr'], ['MVFR', 'mvfr'], ['IFR', 'ifr'], ['LIFR', 'ifr']] as const) {
  for (const id of ['KLXL', '18V', 'P52'] as const) {
    test(`${id} ${cat}: 120-minute sim keeps at most one aircraft on final/runway/departure`, () => {
      const f = airportTraffic[id], wind = { dir: (f.ends[0].trueHdg + 40) % 360, kt: 14 };
      const end = pickRunway(f, wind), a = profileAirport(patternFor(f, end), mode);
      const s = new TrafficSchedule(a, a.aircraft, wind, end.trueHdg, undefined, { mode, climb: id === '18V' ? 0.7 : 1, gust: 8 });
      assert.equal(s.regs.length, mode === 'vfr' ? 3 : mode === 'mvfr' ? 2 : 1);
      for (let t = 0; t < 7200; t += 0.25) {
        const busy = s.regs.map((_, i) => s.sample(i, t)!).filter((q) => EXCLUSIVE.has(legOf(a, q))).length;
        assert.ok(busy <= 1, `t=${t} ${busy}`);
      }
      if (mode === 'ifr') {
        const legs = new Set<string>(); for (let t = 0; t < s.period; t += 0.5) legs.add(legOf(a, s.sample(0, t)!));
        assert.ok(!legs.has('downwind') && !legs.has('base') && !legs.has('crosswind'), 'straight-in only');
      }
    });
  }
}
test('sampled heading includes gust jitter only on base/final', () => {
  const a = airportTraffic.KLXL, p = makeFlightPlan(a, 'N46201', { dir: 131, kt: 10 }, 131, 0, [], 0, { gust: 10 });
  for (let t = 0; t < p.seconds; t += 0.3) { const s = sampleFlight(p, t), seg = p.segments.find((x) => t < x.start + x.seconds)!; if (s.phase !== 'Base' && s.phase !== 'Final') assert.equal(s.heading, seg.heading); }
});
