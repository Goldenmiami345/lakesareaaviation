// Post-build gate: reads every prerendered HTML file from the production output and exits
// non-zero if any route is an empty SSR shell or misses its heading/copy. This runs as part
// of `npm run build`, so a broken server render can never be published silently.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkPrerenderHtml } from './prerender-check.mjs';

const contracts = JSON.parse(readFileSync(new URL('./prerender-contracts.json', import.meta.url), 'utf8'));
const outDir = process.argv[2] ?? 'dist/client';
const failures = [];

for (const path of Object.keys(contracts)) {
  // Lovable writes /about/index.html; Netlify's plugin writes /about.html. Accept either.
  const nested = path === '/' ? join(outDir, 'index.html') : join(outDir, path.slice(1), 'index.html');
  const flat = join(outDir, `${path.slice(1)}.html`);
  const file = existsSync(nested) || path === '/' ? nested : flat;
  if (!existsSync(file)) {
    failures.push(`${path}: prerendered file missing (${file})`);
    continue;
  }
  try {
    const bytes = checkPrerenderHtml(path, readFileSync(file, 'utf8'), contracts);
    console.info(`[ssr-html-ok] ${path} ${bytes} bytes`);
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length) {
  for (const f of failures) console.error(`[ssr-html-fail] ${f}`);
  console.error(`[ssr-html] ${failures.length} route(s) failed the server-render check`);
  process.exit(1);
}
console.info(`[ssr-html] all ${Object.keys(contracts).length} routes passed`);
