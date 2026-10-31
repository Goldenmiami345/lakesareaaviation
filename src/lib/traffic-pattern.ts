// Pure geometry for the animated airport traffic pattern. Coordinates are in
// the aerial image's own pixel space (each USGS aerial is 1500 x 1500).

export type Point = { x: number; y: number };

export type PatternAirport = {
  ident: string;
  /** FAA field elevation, feet MSL. */
  elevation: number;
  /** FAA traffic pattern altitude above the field, feet. */
  tpaAgl: number;
  runway: string;
  side: "left" | "right";
  /** Approach threshold of the active runway (image px). */
  threshold: Point;
  /** Departure end of the active runway (image px). */
  end: Point;
  /** Distance of the downwind leg from the runway, image px. */
  offset: number;
  /** Upwind / final extension beyond each runway end, image px. */
  extension: number;
  aircraft: string[];
};

export type PatternSample = { x: number; y: number; heading: number; agl: number; msl: number; knots: number; phase: string };

type Waypoint = Point & { agl: number; knots: number; phase: string };

export function patternAltitude(airport: Pick<PatternAirport, "elevation" | "tpaAgl">) {
  return Math.round(airport.elevation + airport.tpaAgl);
}

export function patternWaypoints(a: PatternAirport): Waypoint[] {
  const dx = a.end.x - a.threshold.x;
  const dy = a.end.y - a.threshold.y;
  const len = Math.hypot(dx, dy) || 1;
  const u = { x: dx / len, y: dy / len };
  // Image y points down, so a left turn from heading u points to (u.y, -u.x).
  const sign = a.side === "left" ? 1 : -1;
  const n = { x: u.y * sign, y: -u.x * sign };
  const at = (along: number, side: number) => ({ x: a.threshold.x + u.x * along + n.x * side, y: a.threshold.y + u.y * along + n.y * side });
  const tpa = a.tpaAgl;
  const ext = a.extension;
  const off = a.offset;
  return [
    { ...at(len * 0.08, 0), agl: 0, knots: 60, phase: "Touch-and-go" },
    { ...at(len * 0.45, 0), agl: 0, knots: 60, phase: "Takeoff" },
    { ...at(len + ext, 0), agl: tpa * 0.55, knots: 75, phase: "Upwind" },
    { ...at(len + ext, off), agl: tpa * 0.9, knots: 80, phase: "Crosswind" },
    { ...at(len * 0.5, off), agl: tpa, knots: 90, phase: "Downwind" },
    { ...at(-ext, off), agl: tpa, knots: 85, phase: "Downwind" },
    { ...at(-ext, 0), agl: tpa * 0.55, knots: 75, phase: "Base" },
    { ...at(len * 0.08, 0), agl: 0, knots: 65, phase: "Final" },
  ];
}

export function samplePattern(a: PatternAirport, t: number, points = patternWaypoints(a)): PatternSample {
  const segs = points.slice(0, -1).map((p, i) => ({ p, q: points[i + 1]!, l: Math.hypot(points[i + 1]!.x - p.x, points[i + 1]!.y - p.y) }));
  const total = segs.reduce((s, g) => s + g.l, 0) || 1;
  let d = (((t % 1) + 1) % 1) * total;
  for (const g of segs) {
    if (d <= g.l || g === segs[segs.length - 1]) {
      const f = g.l ? Math.min(1, d / g.l) : 0;
      const agl = g.p.agl + (g.q.agl - g.p.agl) * f;
      return {
        x: g.p.x + (g.q.x - g.p.x) * f,
        y: g.p.y + (g.q.y - g.p.y) * f,
        heading: (Math.atan2(g.q.y - g.p.y, g.q.x - g.p.x) * 180) / Math.PI + 90,
        agl,
        msl: Math.round(a.elevation + agl),
        knots: Math.round(g.p.knots + (g.q.knots - g.p.knots) * f),
        phase: g.p.phase,
      };
    }
    d -= g.l;
  }
  const p = points[0]!;
  return { x: p.x, y: p.y, heading: 0, agl: 0, msl: a.elevation, knots: 0, phase: p.phase };
}
