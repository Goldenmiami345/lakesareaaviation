import { SHOW_3D_MODELS } from './site-data';
export const MODEL_SETTINGS = {
  'camera-controls': true, 'touch-action': 'none', 'camera-orbit': '35deg 73deg auto',
  'min-camera-orbit': 'auto 20deg auto', 'max-camera-orbit': 'auto 100deg auto',
  'field-of-view': '30deg', 'min-field-of-view': '15deg', 'max-field-of-view': '45deg',
  'rotation-per-second': '9deg', 'auto-rotate-delay': 0,
  'shadow-intensity': 0.8, 'shadow-softness': 0.9, exposure: 1,
  'environment-image': 'neutral', 'tone-mapping': 'commerce', 'interaction-prompt': 'none',
} as const;
export const MODEL_RESUME_MS = 3000;
/** Fit the rotating aircraft envelope, not a tall sphere in a wide media slot.
 * The sphere is model-viewer's mesh-derived sphere; height bounds preserve wheel/shadow room.
 */
export function modelOrbitRadius(sphereRadius: number, height: number, aspect: number, verticalFov: number) {
  const tan = Math.tan(verticalFov * Math.PI / 360);
  const polar = 73 * Math.PI / 180;
  let distance = sphereRadius;
  // A rotational envelope is independent of the current turntable angle. Test its
  // projected silhouette, including perspective depth, to protect the whole turn.
  for (let i = 0; i < 360; i++) {
    const angle = i * Math.PI / 180;
    const x = sphereRadius * Math.cos(angle), z = sphereRadius * Math.sin(angle);
    for (const y of [-height / 2, height / 2]) {
      const depth = z * Math.sin(polar) + y * Math.cos(polar);
      const vertical = y * Math.sin(polar) - z * Math.cos(polar);
      distance = Math.max(distance, depth + Math.abs(x) / (tan * aspect * .96), depth + Math.abs(vertical) / (tan * .90));
    }
  }
  return distance;
}
export const MODEL_WINGSPANS_M: Record<string, number> = { N4383P: 11.28, N8570B: 10.97, N46201: 11.02 };
/** Supplied renders use literal map scale; retain the legacy footprint for other SVGs. */
export function trafficPresentationScale(reg: string, showModels = SHOW_3D_MODELS) { return showModels && MODEL_WINGSPANS_M[reg] ? 1 : 3; }