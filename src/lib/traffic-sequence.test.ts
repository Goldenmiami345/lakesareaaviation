import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airportTraffic } from './site-data';
import { KLXL_OBLIQUE_PATTERN } from './oblique-view';
import { patternFor, pickRunway, type PatternAirport, type Wind } from './traffic-pattern';
import { TrafficSchedule, RUNWAY_BUFFER_S, legOf, patternSpacingPx, type Leg } from './traffic-sequence';

const MINUTES = 120, TICK = 0.05;
const EXCLUSIVE: ReadonlySet<Leg> = new Set(['final', 'runway', 'departure']);

type Case = { name: string; a: PatternAirport; hdg: number; wind: Wind | null; offsets?: readonly number[] };
const cases: Case[] = [];
for (const id of ['KLXL', '18V', 'P52'] as const) {
  const f = airportTraffic[id];
  // Both runway directions, each with a 10 kt wind straight down that runway.
  for (const end of f.ends) {
    const wind = { dir: end.trueHdg, kt: 10 };
    assert.equal(pickRunway(f, wind).runway, end.runway); // the wind really selects this runway
    cases.push({ name: `${id} rwy ${end.runway}`, a: patternFor(f, end), hdg: end.trueHdg, wind });
  }
  const calm = pickRunway(f, null);
  cases.push({ name: `${id} calm rwy ${calm.runway}`, a: patternFor(f, calm), hdg: calm.trueHdg, wind: null });
}
// The oblique (perspective) view uses the same TrafficSchedule with its own offsets.
cases.push({ name: 'KLXL oblique rwy 13', a: KLXL_OBLIQUE_PATTERN, hdg: 131, wind: { dir: 131, kt: 10 }, offsets: [.08, .68, .95] });

for (const c of cases) {
  test(`${c.name}: ${MINUTES} simulated minutes follow pattern rules`, () => {
    const { a } = c;
    const s = new TrafficSchedule(a, a.aircraft, c.wind, c.hdg, c.offsets);
    const end = MINUTES * 60, min = patternSpacingPx(a);
    s.ensure(end);
    // Every lap lasts exactly one shared period, so lap boundaries never jump.
    for (const laps of s.laps) for (const l of laps) assert.ok(Math.abs(l.t.plan.seconds - s.period) < 1e-3, `lap ${l.t.plan.seconds} vs ${s.period}`);
    // Runway windows (base-to-final turn → past departure end) never overlap.
    const windows = s.laps.flatMap((laps, i) => laps.filter((l) => l.occupied[1] > 0 && l.occupied[0] < end).map((l) => ({ i, w: l.occupied })));
    assert.ok(windows.length > a.aircraft.length * 8, `only ${windows.length} landings`);
    for (const x of windows) for (const y of windows) {
      if (x.i >= y.i) continue;
      assert.ok(!(x.w[0] < y.w[1] + RUNWAY_BUFFER_S && x.w[1] > y.w[0] - RUNWAY_BUFFER_S), `window ${a.aircraft[x.i]} ${x.w} vs ${a.aircraft[y.i]} ${y.w}`);
    }
    const n = a.aircraft.length;
    const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y);
    const ux = (a.end.x - a.threshold.x) / len, uy = (a.end.y - a.threshold.y) / len, side = a.side === 'left' ? 1 : -1;
    const nx = uy * side, ny = -ux * side;
    const trackDir = (leg: Leg) => leg === 'downwind' ? { x: -ux, y: -uy } : leg === 'crosswind' ? { x: nx, y: ny } : leg === 'base' ? { x: -nx, y: -ny } : { x: ux, y: uy };
    const finalTurn = (i: number, t: number) => s.laps[i]!.some((l) => { const ft = l.start + l.t.finalStart; return t <= ft && ft - t <= 10; });
    let prevLeg: Leg[] = [], prevOrder = new Map<string, number>();
    for (let k = 0; k * TICK < end; k++) {
      const t = k * TICK;
      const p = a.aircraft.map((_, i) => s.sample(i, t)!);
      const legs = p.map((q) => legOf(a, q));
      const busy = legs.filter((l) => EXCLUSIVE.has(l)).length;
      assert.ok(busy <= 1, `t=${t.toFixed(2)} ${busy} aircraft on final/runway: ${legs}`);
      const order = new Map<string, number>();
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const u = p[i]!, v = p[j]!;
        const d = Math.hypot(u.x - v.x, u.y - v.y);
        assert.ok(d >= min, `t=${t.toFixed(2)} ${a.aircraft[i]}–${a.aircraft[j]} ${d.toFixed(1)}px < ${min.toFixed(1)}px`);
        if (legs[i] === 'base' && legs[j] === 'base') assert.ok(!(finalTurn(i, t) && finalTurn(j, t)), `t=${t.toFixed(2)} two on base turning final`);
        if (legs[i] === legs[j]) {
          // Same leg: order along the track must not flip while both stay on it.
          // Progress along the leg's nominal track (a 360 in a hold is not a reversal).
          const dir = trackDir(legs[i]!);
          const sign = Math.sign((v.x - u.x) * dir.x + (v.y - u.y) * dir.y);
          const key = `${i}-${j}`, was = prevOrder.get(key);
          if (was !== undefined && prevLeg[i] === legs[i] && prevLeg[j] === legs[j] && sign !== 0) assert.equal(sign, was, `t=${t.toFixed(2)} ${a.aircraft[j]} overtook ${a.aircraft[i]} on ${legs[i]}`);
          if (sign !== 0) order.set(key, sign);
        }
      }
      prevLeg = legs; prevOrder = order;
    }
  });
}

// Live METAR can blow from anywhere: sweep crosswinds too (30 simulated minutes each).
for (const id of ['KLXL', '18V', 'P52'] as const) {
  test(`${id}: wind sweep keeps one airplane on final/runway and spacing`, () => {
    const f = airportTraffic[id];
    for (let dir = 0; dir < 360; dir += 30) for (const kt of [6, 15]) {
      const wind = { dir, kt }, end = pickRunway(f, wind), a = patternFor(f, end);
      const s = new TrafficSchedule(a, a.aircraft, wind, end.trueHdg), min = patternSpacingPx(a);
      for (let t = 0; t < 1800; t += 0.1) {
        const p = a.aircraft.map((_, i) => s.sample(i, t)!);
        const busy = p.filter((q) => EXCLUSIVE.has(legOf(a, q))).length;
        assert.ok(busy <= 1, `${dir}@${kt} t=${t.toFixed(1)} ${busy} on final/runway`);
        for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) assert.ok(Math.hypot(p[i]!.x - p[j]!.x, p[i]!.y - p[j]!.y) >= min, `${dir}@${kt} t=${t.toFixed(1)} spacing`);
      }
    }
  });
}
