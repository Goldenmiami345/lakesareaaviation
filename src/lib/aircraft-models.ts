// Models shipped in public/models (uppercase registration filenames). This is an explicit
// list rather than import.meta.glob: the production bundler tries to *load* globbed .glb
// files as JS modules and fails the build ("Could not load public/models/*.glb").

const AVAILABLE_MODELS = new Set(['N4383P', 'N8570B', 'N46201']);

export function aircraftModelUrl(reg: string, enabled = false): string | null {
  if (!enabled) return null;
  const key = reg.toUpperCase();
  return AVAILABLE_MODELS.has(key) ? `/models/${key}.glb?v=20261104b` : null;
}
