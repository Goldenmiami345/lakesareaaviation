// Heading sprites baked from our own 3D models (models-src/*.glb) at the Private Pilot
// camera pitch: 36 frames, one per 10° of heading relative to the line of sight, 6x6 atlas.
// Frame k shows the airplane flying k*10° clockwise from "straight away from the camera".
import phoenix from "../assets/fleet/top/n8570b-oblique.webp.asset.json";
import apache from "../assets/fleet/top/n4383p-oblique.webp.asset.json";
import cardinal from "../assets/fleet/top/n46201-oblique.webp.asset.json";

export const SPRITE_FRAME = 224;
export const SPRITE_COLS = 6;
/** span = wingspan as a fraction of the frame width (measured on the nose-on frame). */
export const OBLIQUE_SPRITES: Record<string, { url: string; span: number }> = {
  N8570B: { url: phoenix.url, span: 0.9634 },
  N4383P: { url: apache.url, span: 0.9329 },
  N46201: { url: cardinal.url, span: 0.9573 },
};
/** On-screen boost over literal scale so the airplanes read at a glance (owner: "much bigger"). */
export const OBLIQUE_PLANE_BOOST = 3;

/** Atlas frame for an airplane flying `trackDeg` (true) seen along `viewBearingDeg` (camera → airplane). */
export function spriteFrame(trackDeg: number, viewBearingDeg: number) {
  const rel = (((trackDeg - viewBearingDeg) % 360) + 360) % 360;
  return Math.round(rel / 10) % 36;
}
export function frameViewBox(k: number) {
  const F = SPRITE_FRAME;
  return `${(k % SPRITE_COLS) * F} ${Math.floor(k / SPRITE_COLS) * F} ${F} ${F}`;
}
