import { makeFlightPlan, sampleFlight, type FlightPlan, type Hold, type HoldPoint } from './traffic-flight';
import { feetPerPixel, type PatternAirport, type PatternSample, type Wind } from './traffic-pattern';

// US traffic-pattern sequencing shared by the aerial AND oblique views.
// Each lap has one "runway window": from the base-to-final turn until the plane
// has lifted off on its touch-and-go and climbed past the departure end. The
// schedule is a fixed rotation of slots: every airplane flies a lap of exactly the
// same period P = n × slot, its window starting one slot after the airplane ahead,
// and each slot is the longest window + RUNWAY_BUFFER_S. So at most one airplane
// is ever on final, on the runway or departing, arrivals keep their order (nobody
// overtakes or cuts in) and two airplanes never turn final together. The time an
// airplane must lose each lap is absorbed before the base turn, as a controller
// would: a short downwind extension for small delays, otherwise visible 360s
// (turning away from the runway) split over up to three hold points so that two
// airplanes never circle in the same place. Nobody ever has to break off on base.
// All traffic flies continuous touch-and-goes.
export const RUNWAY_BUFFER_S = 5;
const SLOT_MARGIN_S = 0.5;
/** A hold part must end this long before the next airplane reaches the same point. */
const HOLD_CLEAR_S = 12;
const HOLD_POINTS: readonly HoldPoint[] = ['crosswind', 'downwind-early', 'downwind-late'];
/** Delays shorter than this use a downwind extension instead of a 360. */
const MIN_HOLD_S = 12;
const NM_M = 1852;

const pxPerNm = (a: PatternAirport) => NM_M / (feetPerPixel(a) * 0.3048);
/** Final spacing: 1.5 NM, capped at the published final length the map can show. */
export function finalSpacingPx(a: PatternAirport) {
  return Math.min(1.5 * pxPerNm(a), a.extension);
}
/** Pattern spacing: 0.75 NM. Map patterns are drawn compressed (the downwind offset
 * stands in for a real ~1 NM offset), so it scales to 0.75 × offset, the same way
 * final spacing is capped at the drawn final. */
export function patternSpacingPx(a: PatternAirport) {
  return Math.min(0.75 * pxPerNm(a), 0.75 * a.offset);
}
const axis = (a: PatternAirport) => {
  const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y) || 1;
  return { len, ux: (a.end.x - a.threshold.x) / len, uy: (a.end.y - a.threshold.y) / len };
};
export const alongRunway = (a: PatternAirport, p: { x: number; y: number }) => { const { ux, uy } = axis(a); return (p.x - a.threshold.x) * ux + (p.y - a.threshold.y) * uy; };

export type Leg = 'upwind' | 'crosswind' | 'downwind' | 'base' | 'final' | 'runway' | 'departure';
/** Public leg name: runway = threshold to liftoff, departure = airborne until past the departure end. */
export function legOf(a: PatternAirport, s: PatternSample): Leg {
  const along = alongRunway(a, s), len = axis(a).len;
  switch (s.phase) {
    case 'Final': return along >= 0 ? 'runway' : 'final';
    case 'Touch-and-go': return 'runway';
    case 'Takeoff': case 'Upwind': return along <= len ? 'departure' : 'upwind';
    case 'Crosswind': return 'crosswind';
    case 'Base': return 'base';
    default: return 'downwind';
  }
}

type Timing = { plan: FlightPlan; base: number; finalStart: number; departEnd: number; window: number };
function bisectAlong(plan: FlightPlan, a: PatternAirport, lo: number, hi: number, target: number) {
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (alongRunway(a, sampleFlight(plan, m)) < target) lo = m; else hi = m; }
  return hi;
}
function timing(plan: FlightPlan, a: PatternAirport): Timing {
  const first = (phase: string) => plan.segments.find((s) => s.phase === phase)?.start ?? 0;
  const takeoff = first('Takeoff'), cross = first('Crosswind'), finalStart = first('Final');
  const departEnd = bisectAlong(plan, a, takeoff, cross, axis(a).len);
  return { plan, base: first('Base'), finalStart, departEnd, window: plan.seconds - finalStart + departEnd };
}

export type Lap = { start: number; extendPx: number; holds: readonly Hold[]; t: Timing; occupied: [number, number] };
type Config = { extendPx: number; holds: Hold[]; t: Timing };

export class TrafficSchedule {
  readonly laps: Lap[][];
  /** Lap period shared by every airplane, and the slot between consecutive final turns. */
  readonly period: number;
  readonly slot: number;
  private configs: Config[];
  private phase: number[];
  /** `offsets` is accepted for API compatibility; the slot rotation fixes the phasing. */
  constructor(readonly airport: PatternAirport, readonly regs: readonly string[], readonly wind: Wind | null, readonly runwayHeading: number, _offsets?: readonly number[]) {
    this.laps = regs.map(() => []);
    const plan = (reg: string, e = 0, holds: Hold[] = []) => timing(makeFlightPlan(airport, reg, wind, runwayHeading, e, holds), airport);
    const base = regs.map((r) => plan(r));
    const n = Math.max(1, regs.length);
    let slot = Math.max(...base.map((t) => t.window)) + RUNWAY_BUFFER_S + SLOT_MARGIN_S;
    let configs: Config[] = [];
    for (let iter = 0; iter < 6; iter++) {
      const period = Math.max(n * slot, ...base.map((t) => t.plan.seconds + 1e-3));
      // Delays under one tight 360 use a downwind extension; the rest hold.
      const holdPlans = regs.map((r) => plan(r, 0, HOLD_POINTS.map((at) => ({ at, turns: 0, radius: 0 }))));
      const split = this.splitHolds(holdPlans, period, slot);
      configs = regs.map((reg, i) => {
        const d = period - base[i]!.plan.seconds;
        return this.solve(reg, holdPlans[i]!, period, slot, plan, d < MIN_HOLD_S ? undefined : split[i]);
      });
      const need = Math.max(...configs.map((c) => c.t.window)) + RUNWAY_BUFFER_S + SLOT_MARGIN_S;
      if (need <= slot + 1e-6) break;
      slot = need;
    }
    this.slot = slot;
    this.period = Math.max(n * slot, ...configs.map((c) => c.t.plan.seconds));
    this.configs = configs;
    // Airplane i turns final at i × slot (mod period); stagger so airplane 0 is just
    // about to turn final at t = 0 and the rest follow in order.
    this.phase = configs.map((c, i) => i * slot + 4 - c.t.finalStart);
  }
  /** Find the extension or holds that make one lap last exactly `period`. */
  private solve(reg: string, t0: Timing, period: number, _slot: number, plan: (reg: string, e?: number, holds?: Hold[]) => Timing, durations?: Record<HoldPoint, number>): Config {
    const delay = period - t0.plan.seconds;
    if (delay <= 1e-3) return { extendPx: 0, holds: [], t: t0 };
    const a = this.airport;
    const bisect = (lo: number, hi: number, f: (x: number) => Timing) => {
      let best = f(hi);
      for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2, t = f(m); if (t.plan.seconds < period) lo = m; else { hi = m; best = t; } }
      return { x: hi, t: best };
    };
    if (!durations) {
      // Small delays only: extend the downwind (final grows slightly; the slot allows for it).
      const { x, t } = bisect(0, 2 * a.extension, (e) => plan(reg, e));
      return { extendPx: x, holds: [], t };
    }
    // Turn each hold duration into whole 360s at a radius no wider than rMax, then
    // scale every radius together so the lap lasts exactly `period`.
    const rMax = a.offset * 0.42;
    const shape = HOLD_POINTS.flatMap((at) => {
      const d = durations[at]; if (!(d > 0)) return [];
      const entry = t0.plan.holdTimes?.[at]?.entry ?? 0;
      const v = Math.max(1e-3, t0.plan.segments.find((g) => entry < g.start + g.seconds)?.v0 ?? 1);
      const turns = Math.max(1, Math.ceil(d * v / (2 * Math.PI * rMax)));
      return [{ at, turns, radius: d * v / (2 * Math.PI * turns) }];
    });
    const holdsFor = (k: number) => shape.map((h) => ({ ...h, radius: h.radius * k }));
    const { x, t } = bisect(0, 2, (k) => plan(reg, 0, holdsFor(k)));
    return { extendPx: 0, holds: holdsFor(x), t };
  }
  /** Split each airplane's delay over the hold points so that, at every hold point,
   * the next airplane arrives HOLD_CLEAR_S after the one ahead has left (maximin). */
  private splitHolds(base: Timing[], period: number, slot: number) {
    const n = base.length, C = HOLD_CLEAR_S;
    const order: HoldPoint[] = ['crosswind', 'downwind-early', 'downwind-late']; // lap order
    const R = base.map((t) => order.map((at) => t.finalStart - (t.plan.holdTimes?.[at]?.entry ?? 0)));
    const delay = base.map((t) => Math.max(0, period - t.plan.seconds));
    const D = delay.map((d) => order.map(() => d / order.length));
    const gap = (f: number) => f === 0 ? period - (n - 1) * slot : slot;
    const exit = (i: number, j: number) => -(R[i]![j]! + D[i]!.slice(j + 1).reduce((s, x) => s + x, 0));
    const slacks = () => {
      const out: number[] = [];
      if (n < 2) return out;
      for (let f = 0; f < n; f++) { const l = (f + n - 1) % n; for (let j = 0; j < order.length; j++) out.push(gap(f) + exit(f, j) - D[f]![j]! - exit(l, j) - C); }
      return out;
    };
    const score = () => { const s = slacks(); return s.length ? Math.min(...s) * 1000 + s.reduce((x, y) => x + Math.min(y, 20), 0) : 0; };
    const minSlack = () => { const s = slacks(); return s.length ? Math.min(...s) : Infinity; };
    for (const step of [8, 4, 2, 1, 0.5]) {
      if (minSlack() >= 2) break; // comfortably clear everywhere: stop refining
      for (let iter = 0; iter < 200; iter++) {
        let best = score(), move: [number, number, number] | null = null;
        for (let i = 0; i < n; i++) for (let j = 0; j < order.length; j++) for (let k = 0; k < order.length; k++) {
          if (j === k || D[i]![j]! < step) continue;
          D[i]![j]! -= step; D[i]![k]! += step;
          const sc = score(); if (sc > best + 1e-9) { best = sc; move = [i, j, k]; }
          D[i]![j]! += step; D[i]![k]! -= step;
        }
        if (!move) break;
        const [i, j, k] = move; D[i]![j]! -= step; D[i]![k]! += step;
      }
    }
    return D.map((row) => Object.fromEntries(order.map((at, j) => [at, row[j]!])) as Record<HoldPoint, number>);
  }
  private lapIndex(i: number, time: number) { return Math.floor((time - this.phase[i]!) / this.period); }
  /** Materialize laps up to `until` (for inspection and tests; sampling is closed-form). */
  ensure(until: number) {
    this.regs.forEach((_, i) => {
      const laps = this.laps[i]!, c = this.configs[i]!;
      let k = laps.length ? this.lapIndex(i, laps[laps.length - 1]!.start) + 1 : this.lapIndex(i, 0) - 1;
      for (;; k++) {
        const start = this.phase[i]! + k * this.period;
        if (start > until) break;
        laps.push({ start, extendPx: c.extendPx, holds: c.holds, t: c.t, occupied: [start + c.t.finalStart, start + c.t.plan.seconds + c.t.departEnd] });
      }
    });
  }
  sample(i: number, time: number): PatternSample | null {
    const c = this.configs[i]; if (!c) return null;
    const into = time - this.phase[i]! - this.lapIndex(i, time) * this.period;
    return sampleFlight(c.t.plan, Math.min(into, c.t.plan.seconds - 1e-6));
  }
}
