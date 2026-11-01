import { feetPerPixel, patternWaypoints, type PatternAirport, type PatternSample, type Wind, headwind } from './traffic-pattern';

export type AircraftType = '172' | '150' | 'citabria' | 'apache';
export const REAL_TIME_RATE = 1;
export const CALL_DURATION_MS = 3500;
export const PING_DURATION_MS = 600;
export const MAX_CALLS = 2;
export function aircraftType(reg: string): AircraftType {
  return reg === 'N4383P' ? 'apache' : reg === 'N11059' ? 'citabria' : reg === 'N6641F' ? '150' : '172';
}
export function legSpeed(type: AircraftType, phase: string) {
  const trainer: Record<string, number> = { 'Touch-and-go': 55, Takeoff: 72, Upwind: 73, Crosswind: 75, Downwind: type === '172' ? 85 : 78, Base: 70, Final: type === '172' ? 65 : 60 };
  const twin: Record<string, number> = { 'Touch-and-go': 75, Takeoff: 85, Upwind: 90, Crosswind: 95, Downwind: 100, Base: 90, Final: 85 };
  return (type === 'apache' ? twin : trainer)[phase] ?? 75;
}
export function groundSpeed(airspeed: number, wind: Wind | null, trueHeading: number) {
  // Hold the configured ground track with a wind-correction angle. Variable wind
  // has no known component; never invent a wind direction.
  if (!wind || wind.dir === null) return airspeed;
  const cross = wind.kt * Math.sin((wind.dir - trueHeading) * Math.PI / 180);
  return Math.max(20, Math.sqrt(Math.max(0, airspeed * airspeed - cross * cross)) - headwind(wind, trueHeading));
}
type Segment = { p: {x:number;y:number;agl:number}; q: {x:number;y:number;agl:number}; phase: string; heading: number; length: number; v0: number; v1: number; seconds: number; start: number };
export type FlightPlan = { segments: Segment[]; seconds: number; airport: PatternAirport };
const KT_MPS = 1852 / 3600;
// extendPx lengthens the downwind leg (base turn and final start move out along the
// runway axis), the way a controller sequences traffic; 0 keeps the published corners.
// holds add visible 360s (turning away from the runway) at fixed hold points on
// crosswind and downwind, for sequencing delays an extension alone cannot absorb.
export type HoldPoint = 'crosswind' | 'downwind-early' | 'downwind-late';
export type Hold = { at: HoldPoint; turns: number; radius: number };
/** Fraction along the leg (points[k] → points[k+1] after the upwind report is added) where each hold starts. */
export const HOLD_ENTRY: Record<HoldPoint, { k: number; f: number }> = { 'downwind-late': { k: 5, f: .3 }, 'downwind-early': { k: 4, f: .35 }, crosswind: { k: 3, f: .5 } };
export function makeFlightPlan(a: PatternAirport, reg: string, wind: Wind | null = null, runwayHeading = Number(a.runway) * 10, extendPx = 0, holds: readonly Hold[] = []): FlightPlan {
  const original = patternWaypoints(a);
  if (extendPx > 0) {
    const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y) || 1;
    const ux = (a.end.x - a.threshold.x) / len, uy = (a.end.y - a.threshold.y) / len;
    // Base corner (index 5) and final start (index 6) of patternWaypoints.
    for (const k of [5, 6]) { const w = original[k]; if (w) original[k] = { ...w, x: w.x - ux * extendPx, y: w.y - uy * extendPx }; }
  }
  // Add the upwind report on the EXISTING straight departure leg, without moving
  // any corner, runway point, altitude profile or pattern extent.
  const takeoff = original[1], cross = original[2];
  if (!takeoff || !cross) return { segments: [], seconds: 1, airport: a };
  const upwind = { x: takeoff.x + (cross.x - takeoff.x) * .22, y: takeoff.y + (cross.y - takeoff.y) * .22, agl: takeoff.agl + (cross.agl - takeoff.agl) * .22, knots: 73, phase: 'Upwind' };
  const points = [...original.slice(0, 2), upwind, ...original.slice(2)];
  // Downwind 360s turn outward (away from the runway); crosswind 360s turn away from
  // the departure end. Each ring returns exactly to its entry point and heading.
  // Later hold points are inserted first so earlier indices stay valid.
  const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y) || 1;
  const u = { x: (a.end.x - a.threshold.x) / len, y: (a.end.y - a.threshold.y) / len };
  const sign = a.side === 'left' ? 1 : -1, n = { x: u.y * sign, y: -u.x * sign };
  const insertOrbits = (k: number, f: number, d: { x: number; y: number }, side: { x: number; y: number }, hold: Hold | undefined) => {
    const from = points[k], to = points[k + 1], count = Math.round(hold?.turns ?? 0); if (!from || !to || !hold || count <= 0 || hold.radius <= 0) return;
    const q = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, agl: from.agl + (to.agl - from.agl) * f };
    const r = hold.radius, c = { x: q.x + side.x * r, y: q.y + side.y * r };
    const ring = Array.from({ length: 16 * count }, (_, j) => {
      const th = (j + 1) / 16 * 2 * Math.PI;
      return { x: c.x + r * (-side.x * Math.cos(th) + d.x * Math.sin(th)), y: c.y + r * (-side.y * Math.cos(th) + d.y * Math.sin(th)), agl: q.agl, knots: from.knots, phase: from.phase };
    });
    points.splice(k + 1, 0, { ...q, knots: from.knots, phase: from.phase }, ...ring);
  };
  const hold = (at: HoldPoint) => holds.find((h) => h.at === at);
  const at = (h: HoldPoint, d: { x: number; y: number }, side: { x: number; y: number }) => insertOrbits(HOLD_ENTRY[h].k, HOLD_ENTRY[h].f, d, side, hold(h));
  at('downwind-late', { x: -u.x, y: -u.y }, n);
  at('downwind-early', { x: -u.x, y: -u.y }, n);
  at('crosswind', n, u);
  const runwayAngle = Math.atan2(a.end.y - a.threshold.y, a.end.x - a.threshold.x);
  const type = aircraftType(reg);
  const legs = points.slice(0, -1).flatMap((p, i) => {
    const q = points[i + 1]; if (!q) return [];
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    return [{ p, q, heading: angle * 180 / Math.PI + 90, phase: p.phase, speed: groundSpeed(legSpeed(type, p.phase), wind, runwayHeading + (angle - runwayAngle) * 180 / Math.PI), length: Math.hypot(q.x - p.x, q.y - p.y) }];
  });
  const segments: Segment[] = [];
  let start = 0;
  // meters/pixel = published runway feet × 0.3048 / measured runway pixels.
  // 1 kt = 1852/3600 m/s. Thus map px/s = GS(kt) × 1852/3600 /
  // (feetPerPixel × 0.3048), with elapsed wall-clock seconds × 1.0.
  // Speed is linear in distance in each 10% blend: dt = ds/v(s), integrated
  // analytically, so BOTH the displayed GS and measured map derivative agree.
  const metersPerPixel = feetPerPixel(a) * .3048;
  legs.forEach((leg, i) => {
    const prev = legs[(i + legs.length - 1) % legs.length], next = legs[(i + 1) % legs.length];
    const startSpeed = ((prev?.speed ?? leg.speed) + leg.speed) / 2;
    const endSpeed = ((next?.speed ?? leg.speed) + leg.speed) / 2;
    const fs = [0, .1, .9, 1], vs = [startSpeed, leg.speed, leg.speed, endSpeed];
    for (let j = 0; j < 3; j++) {
      const f0 = fs[j] ?? 0, f1 = fs[j + 1] ?? 1, v0 = (vs[j] ?? leg.speed) * KT_MPS / metersPerPixel, v1 = (vs[j + 1] ?? leg.speed) * KT_MPS / metersPerPixel;
      const length = leg.length * (f1 - f0);
      const seconds = Math.abs(v1 - v0) < 1e-8 ? length / v0 : length * Math.log(v1 / v0) / (v1 - v0);
      const at = (f:number) => ({x:leg.p.x+(leg.q.x-leg.p.x)*f,y:leg.p.y+(leg.q.y-leg.p.y)*f,agl:leg.p.agl+(leg.q.agl-leg.p.agl)*f});
      segments.push({p:at(f0),q:at(f1),phase:leg.phase,heading:leg.heading,length,v0,v1,seconds,start}); start += seconds;
    }
  });
  return {segments,seconds:start,airport:a};
}
export function sampleFlight(plan: FlightPlan, seconds: number): PatternSample {
  const t = ((seconds % plan.seconds) + plan.seconds) % plan.seconds;
  const s = plan.segments.find(s => t < s.start + s.seconds) ?? plan.segments[0];
  if (!s) return {x:0,y:0,heading:0,agl:0,msl:plan.airport.elevation,knots:0,phase:'Touch-and-go'};
  const dt = t - s.start, dv = s.v1-s.v0;
  const f = Math.min(1, Math.max(0, Math.abs(dv)<1e-8 ? dt*s.v0/s.length : s.v0*Math.expm1(dt*dv/s.length)/dv));
  const agl = s.p.agl + (s.q.agl-s.p.agl)*f;
  return {x:s.p.x+(s.q.x-s.p.x)*f,y:s.p.y+(s.q.y-s.p.y)*f,heading:s.heading,agl,msl:Math.round(plan.airport.elevation+agl),knots:Math.round((s.v0+dv*f)*feetPerPixel(plan.airport)*.3048/KT_MPS),phase:s.phase};
}