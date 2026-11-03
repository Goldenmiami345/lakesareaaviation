// Models shipped in public/models (uppercase registration filenames). This is an explicit
// list rather than import.meta.glob: the production bundler tries to *load* globbed .glb
// files as JS modules and fails the build ("Could not load public/models/*.glb").
import { SHOW_3D_MODELS } from './site-data';

const AVAILABLE_MODELS = new Set(['N4383P', 'N8570B', 'N46201']);

export function aircraftModelUrl(reg: string, preview = false): string | null {
  if (!preview && !SHOW_3D_MODELS) return null;
  const key = reg.toUpperCase();
  return AVAILABLE_MODELS.has(key) ? `/models/${key}.glb?v=20261103` : null;
}
