import { patternWaypoints, type PatternAirport } from './traffic-pattern';
export type SafeRect = { left: number; top: number; right: number; bottom: number };
/** Image-space geometry is unchanged. Scale is pixels per USGS pixel, not speed. */
export function airportFraming(a: PatternAirport, width: number, height: number, phone: boolean, safe: SafeRect) {
  const points = patternWaypoints(a).slice(0, -1);
  const cx = points.reduce((s,p)=>s+p.x,0)/points.length;
  const cy = points.reduce((s,p)=>s+p.y,0)/points.length;
  const rx = Math.max(...points.map(p=>Math.abs(p.x-cx))) + 28;
  const ry = Math.max(...points.map(p=>Math.abs(p.y-cy))) + 28;
  const base = phone ? Math.max(width/970,height/2100) : Math.max(width/1500,height/1500);
  const requested = phone ? 1.25 : 1.15;
  const scale = Math.min(base*requested,(safe.right-safe.left)/(2*rx),(safe.bottom-safe.top)/(2*ry));
  const x = cx-(safe.left+safe.right)/2/scale;
  const y = cy-(safe.top+safe.bottom)/2/scale;
  return { viewBox: `${x} ${y} ${width/scale} ${height/scale}`, multiplier: scale/base, scale, cx, cy };
}