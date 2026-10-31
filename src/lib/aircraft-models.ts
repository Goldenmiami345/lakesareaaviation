// Glob discovery never requests absent public models or puts their bytes in JS.
const files = import.meta.glob('/public/models/*.glb');
export function aircraftModelUrl(reg: string): string | null {
  const key = Object.keys(files).find(k => k.split('/').pop()?.toLowerCase() === `${reg.toLowerCase()}.glb`);
  return key ? key.replace('/public', '') : null;
}