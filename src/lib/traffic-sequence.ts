import { makeFlightPlan, sampleFlight, type FlightPlan, type Hold } from './traffic-flight';
import type { TrafficConditions } from './wx-conditions';
import { feetPerPixel, type PatternAirport, type PatternSample, type Wind } from './traffic-pattern';

// US traffic-pattern sequencing shared by the aerial AND oblique views.
// Each lap has one "runway window": from the base-to-final turn until the plane
// has lifted off on its touch-and-go and climbed past the departure end. The
// schedule is a fixed rotation of slots: every airplane flies a lap of exactly the
// same period P = n × slot, its window starting one slot after the airplane ahead,
// and each slot is the longest window + RUNWAY_BUFFER_S. So at most one airplane
// is ever on final, on the runway or departing, arrivals keep their order (nobody
// overtakes or cuts in) and two airplanes never turn final together. A small
// downwind extension and longer departure-side upwind/downwind absorb the delay
// without recurring circles or growing final until the slot solver diverges.
// All traffic flies continuous touch-and-goes.
export const RUNWAY_BUFFER_S = 5;
const SLOT_MARGIN_S = 0.5;
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

export type Lap = { start: number; extendPx: number; departureExtendPx: number; holds: readonly Hold[]; t: Timing; occupied: [number, number] };
type Config = { departureExtendPx: number; extendPx: number; holds: Hold[]; t: Timing };

export class TrafficSchedule {
  readonly laps: Lap[][];
  readonly regs: readonly string[];
  /** Lap period shared by every airplane, and the slot between consecutive final turns. */
  readonly period: number;
  readonly slot: number;
  private configs: Config[];
  private phase: number[];
  /** `offsets` is accepted for API compatibility; the slot rotation fixes the phasing. */
  /** True when IFR: one aircraft flies a straight-in practice approach, no VFR pattern. */
  readonly approach: boolean;
  constructor(readonly airport: PatternAirport, regs: readonly string[], readonly wind: Wind | null, readonly runwayHeading: number, _offsets?: readonly number[], conditions?: Partial<TrafficConditions>) {
    const opts = { climb: conditions?.climb ?? 1, gust: conditions?.gust ?? 0, ...(conditions?.approachPx ? { approachPx: conditions.approachPx } : {}), ...(conditions?.departPx ? { departPx: conditions.departPx } : {}) };
    this.approach = conditions?.mode === 'ifr';
    if (this.approach) regs = regs.slice(0, 1);
    this.regs = regs;
    this.laps = regs.map(() => []);
    if (this.approach) {
      // Single straight-in: the lap is the approach itself; nothing else can occupy the runway.
      const p = makeFlightPlan(airport, regs[0] ?? '', wind, runwayHeading, 0, [], 0, { ...opts, approach: true });
      const finalStart = 0, takeoff = p.segments.find((x) => x.phase === 'Takeoff')?.start ?? p.seconds;
      const t: Timing = { plan: p, base: 0, finalStart, departEnd: bisectAlong(p, airport, takeoff, p.seconds - 1e-6, axis(airport).len), window: p.seconds };
      this.slot = this.period = p.seconds;
      this.configs = [{ extendPx: 0, departureExtendPx: 0, holds: [], t }];
      this.phase = [0];
      return;
    }
    const plan = (reg: string, e = 0, holds: Hold[] = []) => timing(makeFlightPlan(airport, reg, wind, runwayHeading, e, holds, 0, opts), airport);
    const arrivalExtension = airport.offset * .08;
    const base = regs.map((r) => plan(r, arrivalExtension));
    const n = Math.max(1, regs.length);
    // Final is deliberately NOT lengthened to absorb the shared-period delay:
    // that would grow the exclusive window faster than the available slots.
    // A small arrival-side extension handles initial sequencing; the remaining
    // delay lengthens the departure-side upwind/downwind circuit without 360s.
    const slot = Math.max(...base.map((t) => t.window)) + RUNWAY_BUFFER_S + SLOT_MARGIN_S;
    const period = Math.max(n * slot, ...base.map((t) => t.plan.seconds));
    const configs: Config[] = regs.map((reg, i) => {
      const initial = base[i];
      if (!initial) throw new Error('Missing traffic timing');
      const fit = (u: number) => timing(makeFlightPlan(airport, reg, wind, runwayHeading, arrivalExtension, [], u, opts), airport);
      let lo = 0, hi = airport.offset;
      while (fit(hi).plan.seconds < period) hi *= 2;
      for (let k = 0; k < 36; k++) {
        const mid = (lo + hi) / 2;
        if (fit(mid).plan.seconds < period) lo = mid; else hi = mid;
      }
      const t = fit(hi);
      if (Math.abs(t.plan.seconds-period)>1e-3 || t.window+RUNWAY_BUFFER_S>slot) throw new Error('Unsafe traffic schedule');
      return { extendPx: arrivalExtension, departureExtendPx: hi, holds: [], t };
    });
    this.slot = slot;
    this.period = period;
    this.configs = configs;
    this.phase = configs.map((c, i) => i * slot + 4 - c.t.finalStart);
  }
  private lapIndex(i: number, time: number) { return Math.floor((time - (this.phase[i] ?? 0)) / this.period); }
  /** Materialize laps up to `until` (for inspection and tests; sampling is closed-form). */
  ensure(until: number) {
    this.regs.forEach((_, i) => {
      const laps = this.laps[i], c = this.configs[i];
      if (!laps || !c) return;
      const last = laps[laps.length-1];
      let k = last ? this.lapIndex(i, last.start) + 1 : this.lapIndex(i, 0) - 1;
      for (;; k++) {
        const start = (this.phase[i] ?? 0) + k * this.period;
        if (start > until) break;
        laps.push({ start, extendPx: c.extendPx, departureExtendPx: c.departureExtendPx, holds: c.holds, t: c.t, occupied: [start + c.t.finalStart, start + c.t.plan.seconds + c.t.departEnd] });
      }
    });
  }
  /** Approach mode fades the airplane in/out over 3 s at the lap ends (the loop restarts out on final). */
  visibility(i: number, time: number) {
    if (!this.approach) return 1;
    const into = time - (this.phase[i] ?? 0) - this.lapIndex(i, time) * this.period;
    return Math.max(0, Math.min(1, into / 3, (this.period - into) / 3));
  }
  sample(i: number, time: number): PatternSample | null {
    const c = this.configs[i]; if (!c) return null;
    const into = time - (this.phase[i] ?? 0) - this.lapIndex(i, time) * this.period;
    return sampleFlight(c.t.plan, Math.min(into, c.t.plan.seconds - 1e-6));
  }
}
