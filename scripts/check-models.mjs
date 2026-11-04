// Guards public/models/*.glb against collapsed geometry (e.g. re-quantizing an already packed file).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] || 'public/models';
const MAX = 2.5 * 1024 * 1024;
let failed = false;
for (const name of readdirSync(dir).filter((n) => n.endsWith('.glb')).sort()) {
  const file = join(dir, name);
  const buf = readFileSync(file);
  const size = statSync(file).size;
  const errs = [];
  if (size > MAX) errs.push(`size ${size} > 2.5 MB`);
  const len = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  (gltf.meshes || []).forEach((m, mi) => m.primitives.forEach((p, pi) => {
    const a = gltf.accessors[p.attributes.POSITION];
    if (!a?.min || !a?.max) { errs.push(`mesh ${mi} prim ${pi} POSITION accessor lacks min/max`); return; }
    const flat = [0, 1, 2].filter((k) => a.min[k] === a.max[k]);
    if (flat.length >= 2) errs.push(`mesh ${mi} prim ${pi} POSITION collapsed on axes ${flat.map((k) => 'xyz'[k]).join('')} (min ${a.min} max ${a.max})`);
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a.min[k]); hi[k] = Math.max(hi[k], a.max[k]); }
  }));
  const ext = hi.map((h, k) => +(h - lo[k]).toPrecision(4));
  ext.forEach((e, k) => { if (!(e > 0)) errs.push(`whole-model extent flat on axis ${'xyz'[k]}`); });
  console.log(`${errs.length ? 'FAIL' : 'ok  '} ${name} ${(size / 1024).toFixed(0)} KB, raw POSITION extent ${ext.join(' x ')}`);
  errs.slice(0, 5).forEach((e) => console.log(`     - ${e}`));
  if (errs.length) failed = true;
}
if (failed) { console.error('check-models: FAILED'); process.exit(1); }
console.log('check-models: all models passed');
