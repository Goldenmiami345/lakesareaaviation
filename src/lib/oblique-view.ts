// Ground mapping for the oblique Private Pilot photo of KLXL (1376 x 768).
// The traffic pattern is computed in a local runway frame (runway 13 threshold
// at 0,0, departure end at 1000,0, left traffic toward negative y) and
// projected into the photo with a homography fitted to visible ground marks.
import type { PatternAirport } from "./traffic-pattern";

export const KLXL_OBLIQUE = {
  width: 1376,
  height: 768,
  /** Image px per foot along the runway at its midpoint (4,010 ft ≈ 770 px). */
  pxPerFt: 770 / 4010,
  /** Height in image px of a 1,000 ft AGL climb at runway-mid scale. */
  liftPx: 95,
  // Ground quad: runway 13 threshold, runway 31 threshold, then the downwind
  // line (NE, hangar side) abeam each end.
  quad: [
    { x: 545, y: 252 },
    { x: 1275, y: 495 },
    { x: 1215, y: 335 },
    { x: 640, y: 182 },
  ],
} as const;

// Same proportions (offset, extension) as the KLXL aerial pattern, in local units.
export const KLXL_OBLIQUE_PATTERN: PatternAirport = {
  ident: "KLXL", elevation: 1123, tpaAgl: 1000, runway: "13", runwayFt: 4010, side: "left",
  threshold: { x: 0, y: 0 }, end: { x: 1000, y: 0 }, offset: 616, extension: 220,
  aircraft: ["N6717A", "N8570B", "N3353P"],
};

type M = number[];
function squareToQuad(q: readonly { x: number; y: number }[]): M {
  const [p0, p1, p2, p3] = q as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
  // unit square (0,0)(1,0)(1,1)(0,1) -> p0 p1 p2 p3
  const sx = p0.x - p1.x + p2.x - p3.x, sy = p0.y - p1.y + p2.y - p3.y;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x, p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h, 1];
}
const H = squareToQuad(KLXL_OBLIQUE.quad);
const apply = (u: number, v: number) => {
  const w = H[6]! * u + H[7]! * v + 1;
  return { x: (H[0]! * u + H[1]! * v + H[2]!) / w, y: (H[3]! * u + H[4]! * v + H[5]!) / w };
};
const toUV = (x: number, y: number) => ({ u: x / KLXL_OBLIQUE_PATTERN.end.x, v: -y / KLXL_OBLIQUE_PATTERN.offset });
const stepLen = (u: number, v: number) => { const a = apply(u, v), b = apply(u + 0.001, v); return Math.hypot(b.x - a.x, b.y - a.y); };
const REF = stepLen(0.5, 0);

/** Project a local pattern point to photo px, with its relative perspective scale (1 = runway midpoint). */
export function obliqueProject(x: number, y: number) {
  const { u, v } = toUV(x, y);
  const p = apply(u, v);
  return { x: p.x, y: p.y, scale: stepLen(u, v) / REF };
}
