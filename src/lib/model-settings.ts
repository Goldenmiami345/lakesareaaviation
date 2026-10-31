export const MODEL_SETTINGS = {
  'camera-controls': true, 'touch-action': 'none', 'camera-orbit': '35deg 75deg auto',
  'min-camera-orbit': 'auto 20deg auto', 'max-camera-orbit': 'auto 100deg auto',
  'field-of-view': '30deg', 'rotation-per-second': '12deg', 'auto-rotate-delay': 1500,
  'shadow-intensity': 0.8, 'shadow-softness': 0.9, exposure: 1,
  'environment-image': 'neutral', 'tone-mapping': 'commerce', 'interaction-prompt': 'none',
} as const;
export const MODEL_WINGSPANS_M: Record<string, number> = { N4383P: 11.28, N8570B: 10.97, N46201: 11.02 };
/** Supplied renders use literal map scale; retain the legacy footprint for other SVGs. */
export function trafficPresentationScale(reg: string) { return MODEL_WINGSPANS_M[reg] ? 1 : 3; }