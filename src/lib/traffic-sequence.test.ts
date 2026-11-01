import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airportTraffic } from './site-data';
import { TrafficSchedule, RUNWAY_BUFFER_S, finalSpacingPx } from './traffic-sequence';

const HOUR = 3600;
for (const id of ['KLXL', '18V', 'P52'] as const) {
  const a = airportTraffic[id];
  test(`${id}: 60 simulated minutes with no runway incursions`, () => {
    const s = new TrafficSchedule(a, a.aircraft, null, Number(a.runway) * 10);
    s.ensure(HOUR);
    const windows = s.laps.flatMap((laps, i) => laps.filter((l) => l.occupied[1] > 0 && l.occupied[0] < HOUR).map((l) => ({ i, w: l.occupied })));
    assert.ok(windows.length > a.aircraft.length * 5, `only ${windows.length} landings`);
    for (const x of windows) for (const y of windows) {
      if (x.i >= y.i) continue;
      const overlap = x.w[0] < y.w[1] + RUNWAY_BUFFER_S && x.w[1] > y.w[0] - RUNWAY_BUFFER_S;
      assert.ok(!overlap, `${a.aircraft[x.i]} ${x.w} vs ${a.aircraft[y.i]} ${y.w}`);
    }
  });
  test(`${id}: 60 simulated minutes with final spacing kept`, () => {
    const s = new TrafficSchedule(a, a.aircraft, null, Number(a.runway) * 10);
    const min = finalSpacingPx(a);
    for (let t = 0; t < HOUR; t += 0.5) {
      const p = a.aircraft.map((_, i) => s.sample(i, t));
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
        const u = p[i], v = p[j];
        if (u && v && u.phase === 'Final' && v.phase === 'Final') assert.ok(Math.hypot(u.x - v.x, u.y - v.y) >= min - 1e-6, `${id} t=${t}`);
      }
    }
  });
}
