// Glob discovery never requests absent public models or puts their bytes in JS.
import { SHOW_3D_MODELS } from './site-data';
const files = import.meta.glob('/public/models/*.glb');
export function aircraftModelUrl(reg: string, preview = false): string | null {
  if (!preview && !SHOW_3D_MODELS) return null;
  const key = Object.keys(files).find(k => k.split('/').pop()?.toLowerCase() === `${reg.toLowerCase()}.glb`);
  return key ? key.replace('/public', '') : null;
}