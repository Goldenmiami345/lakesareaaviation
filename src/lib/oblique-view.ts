// Camera model for the Private Pilot oblique view of Little Falls (KLXL).
// The picture is a perspective rendering of the USGS NAIP aerial with both
// runways redrawn from FAA end coordinates; this is the exact pinhole camera
// it was rendered with, so traffic drawn here lines up with the ground.
// Ground frame: metres east/north of the runway 13 end (45°57.157'N 094°21.067'W).
import type { PatternAirport } from "./traffic-pattern";

const FT = 0.3048;

export const KLXL_RUNWAYS = {
  // FAA/AirNav end coordinates converted to the local ground frame (m).
  "13": { e: 0, n: 0 },
  "31": { e: 926.22, n: -797.79 },
  "18": { e: 119.97, n: 44.53 },
  "36": { e: 98.04, n: -827.47 },
} as const;

export const KLXL_OBLIQUE = {
  width: 1376,
  height: 768,
  // Camera south of the field, 520 m above it, looking north-northeast.
  camera: { e: 136.25, n: -1344.57, h: 520, yawDeg: 6.0708, pitchDeg: 29.6329, f: 636.24 },
} as const;

// Pattern in a local runway frame: runway 13 end at (0,0), runway 31 end at
// (1000,0), left traffic toward negative y (the hangar side, northeast).
export const KLXL_OBLIQUE_PATTERN: PatternAirport = {
  ident: "KLXL", elevation: 1123, tpaAgl: 1000, runway: "13", runwayFt: 4010, side: "left",
  threshold: { x: 0, y: 0 }, end: { x: 1000, y: 0 }, offset: 616, extension: 220,
  aircraft: ["N6717A", "N8570B", "N4383P"],
};

const r13 = KLXL_RUNWAYS["13"], r31 = KLXL_RUNWAYS["31"];
const LEN = Math.hypot(r31.e - r13.e, r31.n - r13.n);
const U = { e: (r31.e - r13.e) / LEN, n: (r31.n - r13.n) / LEN }; // along runway 13
const LEFT = { e: -U.n, n: U.e }; // left of a pilot landing runway 13

const c = KLXL_OBLIQUE.camera;
const yaw = (c.yawDeg * Math.PI) / 180, pitch = (c.pitchDeg * Math.PI) / 180;
const FWD = [Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), -Math.sin(pitch)] as const;
const RIGHT = [Math.cos(yaw), -Math.sin(yaw), 0] as const;
const UP = [RIGHT[1] * FWD[2] - RIGHT[2] * FWD[1], RIGHT[2] * FWD[0] - RIGHT[0] * FWD[2], RIGHT[0] * FWD[1] - RIGHT[1] * FWD[0]] as const;
const dot = (a: readonly number[], b: readonly number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/** Ground point (m east/north of the 13 end, height m) to picture px, with depth. */
export function projectGround(e: number, n: number, h = 0) {
  const v = [e - c.e, n - c.n, h - c.h];
  const z = dot(v, FWD);
  return { x: KLXL_OBLIQUE.width / 2 + (c.f * dot(v, RIGHT)) / z, y: KLXL_OBLIQUE.height / 2 - (c.f * dot(v, UP)) / z, z };
}

/** Local pattern point (and height above the field, ft) to ground metres. */
export function patternToGround(x: number, y: number) {
  const along = (x / KLXL_OBLIQUE_PATTERN.end.x) * LEN;
  const left = (-y / KLXL_OBLIQUE_PATTERN.end.x) * LEN;
  return { e: r13.e + U.e * along + LEFT.e * left, n: r13.n + U.n * along + LEFT.n * left };
}

const MID = projectGround(r13.e + U.e * LEN / 2, r13.n + U.n * LEN / 2);
/** Picture px per foot at the runway midpoint (ground). */
export const PX_PER_FT_MID = (c.f / MID.z) * FT;

/** Project a local pattern point at `aglFt` to picture px; scale is relative to the runway midpoint. */
export function obliqueProject(x: number, y: number, aglFt = 0) {
  const g = patternToGround(x, y);
  const p = projectGround(g.e, g.n, aglFt * FT);
  return { x: p.x, y: p.y, scale: MID.z / p.z };
}
