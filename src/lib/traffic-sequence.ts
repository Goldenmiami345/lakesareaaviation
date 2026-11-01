import { makeFlightPlan, sampleFlight, type FlightPlan } from './traffic-flight';
import { feetPerPixel, type PatternAirport, type PatternSample, type Wind } from './traffic-pattern';

// Runway sequencing: one airplane on the runway at a time. A plane occupies the
// runway from crossing the threshold on final until it is airborne past the
// departure end. Before each base turn its window is projected; if it would
// overlap another plane's window (± RUNWAY_BUFFER_S) or bring it within the final
// spacing minimum of another plane on final, its downwind is extended until clear.
// All traffic flies continuous touch-and-goes, so nobody departs from hold-short.
export const RUNWAY_BUFFER_S = 6;
const STEP_PX = 6;
const MAX_EXTEND_PX = 1500;
const NM_M = 1852;

/** Final spacing: 1.5 NM, capped at the published final length the map can show. */
export function finalSpacingPx(a: PatternAirport) {
  return Math.min(1.5 * NM_M / (feetPerPixel(a) * 0.3048), a.extension);
}
const axis = (a: PatternAirport) => {
  const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y) || 1;
  return { len, ux: (a.end.x - a.threshold.x) / len, uy: (a.end.y - a.threshold.y) / len };
};
export const alongRunway = (a: PatternAirport, p: { x: number; y: number }) => { const { ux, uy } = axis(a); return (p.x - a.threshold.x) * ux + (p.y - a.threshold.y) * uy; };

type Timing = { plan: FlightPlan; base: number; finalStart: number; threshold: number; liftoffPastEnd: number };
function bisect(plan: FlightPlan, a: PatternAirport, lo: number, hi: number, target: number) {
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (alongRunway(a, sampleFlight(plan, m)) < target) lo = m; else hi = m; }
  return hi;
}
function timing(plan: FlightPlan, a: PatternAirport): Timing {
  const first = (phase: string) => plan.segments.find((s) => s.phase === phase)?.start ?? 0;
  const base = first('Base'), finalStart = first('Final'), takeoff = first('Takeoff'), cross = first('Crosswind');
  const end = plan.seconds - 1e-6;
  return { plan, base, finalStart, threshold: bisect(plan, a, finalStart, end, 0), liftoffPastEnd: bisect(plan, a, takeoff, cross, axis(a).len) };
}

export type Lap = { start: number; extendPx: number; t: Timing; occupied: [number, number] };

export class TrafficSchedule {
  readonly laps: Lap[][];
  private cache = new Map<string, Timing>();
  constructor(readonly airport: PatternAirport, readonly regs: readonly string[], readonly wind: Wind | null, readonly runwayHeading: number, offsets?: readonly number[]) {
    this.laps = regs.map(() => []);
    const first = regs.map((reg, i) => -this.timing(reg, 0).plan.seconds * (offsets?.[i] ?? (i / regs.length + 0.05)));
    this.firstStarts = first;
  }
  private firstStarts: number[];
  private timing(reg: string, e: number) {
    const key = `${reg}:${e}`;
    let t = this.cache.get(key);
    if (!t) { t = timing(makeFlightPlan(this.airport, reg, this.wind, this.runwayHeading, e), this.airport); this.cache.set(key, t); }
    return t;
  }
  private nextStart(i: number) { const l = this.laps[i]!; const last = l[l.length - 1]; return last ? last.start + last.t.plan.seconds : this.firstStarts[i]!; }
  private lapAt(i: number, time: number) { return this.laps[i]!.find((l) => time >= l.start && time < l.start + l.t.plan.seconds); }
  private clear(i: number, start: number, t: Timing) {
    const occ: [number, number] = [start + t.threshold, start + t.plan.seconds + this.timing(this.regs[i]!, 0).liftoffPastEnd];
    for (let j = 0; j < this.regs.length; j++) {
      if (j === i) continue;
      for (const l of this.laps[j]!) if (occ[0] < l.occupied[1] + RUNWAY_BUFFER_S && occ[1] > l.occupied[0] - RUNWAY_BUFFER_S) return null;
    }
    const min = finalSpacingPx(this.airport);
    for (let s = start + t.base; s <= start + t.threshold; s += 0.5) {
      const me = sampleFlight(t.plan, s - start);
      for (let j = 0; j < this.regs.length; j++) {
        if (j === i) continue;
        const l = this.lapAt(j, s); if (!l) continue;
        const o = sampleFlight(l.t.plan, s - l.start);
        const onFinal = me.phase === 'Final' || o.phase === 'Final';
        if (onFinal && (o.phase === 'Final' || o.phase === 'Base') && Math.hypot(o.x - me.x, o.y - me.y) < min) return null;
      }
    }
    return occ;
  }
  /** Decide laps (earliest base turn first) until every plane is scheduled past `until`. */
  ensure(until: number) {
    for (;;) {
      let pick = -1, best = Infinity;
      this.regs.forEach((reg, i) => { const st = this.nextStart(i); if (st <= until) { const d = st + this.timing(reg, 0).base; if (d < best) { best = d; pick = i; } } });
      if (pick < 0) return;
      const reg = this.regs[pick]!, start = this.nextStart(pick);
      let e = 0, occ: [number, number] | null = null, t = this.timing(reg, 0);
      for (; e <= MAX_EXTEND_PX; e += STEP_PX) { t = this.timing(reg, e); occ = this.clear(pick, start, t); if (occ) break; }
      if (!occ) { e = MAX_EXTEND_PX; t = this.timing(reg, e); occ = [start + t.threshold, start + t.plan.seconds + this.timing(reg, 0).liftoffPastEnd]; }
      this.laps[pick]!.push({ start, extendPx: e, t, occupied: occ });
    }
  }
  sample(i: number, time: number): PatternSample | null {
    const reg = this.regs[i]; if (!reg) return null;
    this.ensure(time + 600);
    const laps = this.laps[i]!;
    const lap = this.lapAt(i, time) ?? laps[0];
    return lap ? sampleFlight(lap.t.plan, time - lap.start) : null;
  }
}
