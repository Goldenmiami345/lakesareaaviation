import { makeFlightPlan, sampleFlight, type FlightPlan } from './traffic-flight';
import { feetPerPixel, type PatternAirport, type PatternSample, type Wind } from './traffic-pattern';

// US traffic-pattern sequencing shared by the aerial AND oblique views.
// Each lap has one "runway window": from the base-to-final turn until the plane
// has lifted off on its touch-and-go and climbed past the departure end. Windows
// never overlap (+ RUNWAY_BUFFER_S), arrivals keep first-come order (no cutting
// inside traffic ahead), and every plane keeps patternSpacingPx from all others
// for its whole lap. The decision is made before the base turn; a plane that
// cannot be cleared extends its downwind (preferred, up to maxExtendPx) or flies
// visible 360s on downwind, as a controller would, so nobody ever has to break off
// on base. All traffic flies continuous touch-and-goes.
export const RUNWAY_BUFFER_S = 5;
const STEP_PX = 4;
const MAX_ORBITS = 6;
/** Longest downwind extension: final may grow to 3× the drawn final before a 360 is used instead. */
const maxExtendPx = (a: PatternAirport) => 2 * a.extension;
const SPACING_STEP_S = 0.5;
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

type Timing = { plan: FlightPlan; base: number; finalStart: number; departEnd: number };
function bisect(plan: FlightPlan, a: PatternAirport, lo: number, hi: number, target: number) {
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (alongRunway(a, sampleFlight(plan, m)) < target) lo = m; else hi = m; }
  return hi;
}
function timing(plan: FlightPlan, a: PatternAirport): Timing {
  const first = (phase: string) => plan.segments.find((s) => s.phase === phase)?.start ?? 0;
  const takeoff = first('Takeoff'), cross = first('Crosswind');
  return { plan, base: first('Base'), finalStart: first('Final'), departEnd: bisect(plan, a, takeoff, cross, axis(a).len) };
}

export type Lap = { start: number; extendPx: number; orbits: number; crosswindOrbits: number; t: Timing; occupied: [number, number] };

export class TrafficSchedule {
  readonly laps: Lap[][];
  private cache = new Map<string, Timing>();
  private firstStarts: number[];
  constructor(readonly airport: PatternAirport, readonly regs: readonly string[], readonly wind: Wind | null, readonly runwayHeading: number, offsets?: readonly number[]) {
    this.laps = regs.map(() => []);
    this.firstStarts = regs.map((reg, i) => -this.timing(reg, 0).plan.seconds * (offsets?.[i] ?? (i / regs.length + 0.05)));
  }
  private timing(reg: string, e: number, orbits = 0, crosswind = 0) {
    const key = `${reg}:${e}:${orbits}:${crosswind}`;
    let t = this.cache.get(key);
    if (!t) { t = timing(makeFlightPlan(this.airport, reg, this.wind, this.runwayHeading, e, orbits, crosswind), this.airport); this.cache.set(key, t); }
    return t;
  }
  private nextStart(i: number) { const l = this.laps[i]!; const last = l[l.length - 1]; return last ? last.start + last.t.plan.seconds : this.firstStarts[i]!; }
  private lapAt(i: number, time: number) {
    const laps = this.laps[i]!;
    for (let k = laps.length - 1; k >= 0; k--) { const l = laps[k]!; if (time >= l.start) return time < l.start + l.t.plan.seconds ? l : undefined; }
    return undefined;
  }
  private window(i: number, start: number, t: Timing): [number, number] {
    return [start + t.finalStart, start + t.plan.seconds + this.timing(this.regs[i]!, 0).departEnd];
  }
  /** Runway window clear of everyone (buffered) and behind every earlier arrival. */
  private runwayClear(i: number, occ: [number, number]) {
    for (let j = 0; j < this.regs.length; j++) {
      if (j === i) continue;
      for (const l of this.laps[j]!) {
        if (occ[0] < l.occupied[1] + RUNWAY_BUFFER_S && occ[1] > l.occupied[0] - RUNWAY_BUFFER_S) return false;
        if (l.occupied[0] > occ[0]) return false; // no cutting in front of traffic already sequenced
      }
    }
    return true;
  }
  private spacingClear(i: number, start: number, t: Timing) {
    const min = patternSpacingPx(this.airport) * 1.06; // margin for sampling between checks
    for (let s = Math.max(0, start); s <= start + t.plan.seconds; s += SPACING_STEP_S) {
      const me = sampleFlight(t.plan, s - start);
      for (let j = 0; j < this.regs.length; j++) {
        if (j === i) continue;
        const l = this.lapAt(j, s); if (!l) continue;
        const o = sampleFlight(l.t.plan, s - l.start);
        if (Math.hypot(o.x - me.x, o.y - me.y) < min) return false;
      }
    }
    return true;
  }
  /** Decide laps (earliest base turn first) until every plane is scheduled past `until`. */
  ensure(until: number) {
    for (;;) {
      let pick = -1, best = Infinity;
      this.regs.forEach((reg, i) => { const st = this.nextStart(i); if (st <= until) { const d = st + this.timing(reg, 0).base; if (d < best) { best = d; pick = i; } } });
      if (pick < 0) return;
      const reg = this.regs[pick]!, start = this.nextStart(pick);
      let found: { e: number; orbits: number; crosswind: number; t: Timing } | null = null;
      // Preference: plain downwind extension, then the fewest 360s, held on downwind
      // first and spread onto crosswind so two holding airplanes never share a ring.
      search: for (let total = 0; total <= MAX_ORBITS; total++) {
        for (let orbits = total; orbits >= 0; orbits--) {
          const crosswind = total - orbits;
          for (let e = 0; e <= maxExtendPx(this.airport); e += STEP_PX) {
            const t = this.timing(reg, e, orbits, crosswind);
            if (this.runwayClear(pick, this.window(pick, start, t)) && this.spacingClear(pick, start, t)) { found = { e, orbits, crosswind, t }; break search; }
          }
        }
      }
      const lap = found ?? { e: 0, orbits: MAX_ORBITS, crosswind: 0, t: this.timing(reg, 0, MAX_ORBITS) };
      this.laps[pick]!.push({ start, extendPx: lap.e, orbits: lap.orbits, crosswindOrbits: lap.crosswind, t: lap.t, occupied: this.window(pick, start, lap.t) });
    }
  }
  sample(i: number, time: number): PatternSample | null {
    const reg = this.regs[i]; if (!reg) return null;
    this.ensure(time + 600);
    const lap = this.lapAt(i, time) ?? this.laps[i]![0];
    return lap ? sampleFlight(lap.t.plan, time - lap.start) : null;
  }
}
