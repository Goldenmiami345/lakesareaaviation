// Shared, dependency-free page-content check. Used by the prerender onSuccess hook
// (scripts/verify-prerender.ts) and by the post-build dist scan (scripts/check-prerender-dist.mjs).

export const FLEET_ORDER = ['N8570B', 'N4383P', 'N46201', 'N6717A', 'N6641F', 'N96150', 'N11059', 'N7108G'];

function text(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Throws when the HTML is an empty/failed SSR shell or misses the route's heading/copy. */
export function checkPrerenderHtml(path, html, contracts) {
  const contract = contracts[path];
  if (!contract) throw new Error(`Missing prerender contract: ${path}`);
  const tag = path === '/hero-options' ? 'h2' : 'h1';
  const headings = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map((m) => text(m[1] ?? ''));
  const body = text(html.split(/<body\b[^>]*>/i)[1] ?? '');
  const failedBoundary = html.includes('<!--$!-->');
  if (!headings.includes(contract.heading) || !body.includes(contract.copy) || failedBoundary) {
    throw new Error(`Incomplete production HTML at ${path}: expected heading "${contract.heading}" and page copy; unfinished SSR boundary=${failedBoundary}`);
  }
  if (path === '/fleet') {
    let last = -1;
    for (const reg of FLEET_ORDER) {
      const at = body.indexOf(reg);
      if (at <= last) throw new Error(`Fleet production HTML missing/out of order: ${reg}`);
      last = at;
    }
  }
  return new TextEncoder().encode(html).length;
}
