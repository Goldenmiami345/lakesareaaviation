import contracts from './prerender-contracts.json';

function text(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Called with the actual production renderer's HTML, not a dev response. */
export function verifyPrerender({ page, html }: { page: { path: string }; html: string }) {
  const contract = contracts[page.path as keyof typeof contracts];
  if (!contract) throw new Error(`Missing prerender contract: ${page.path}`);
  const tag = page.path === '/hero-options' ? 'h2' : 'h1';
  const headings = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map(m => text(m[1] ?? ''));
  const body = text(html.split(/<body\b[^>]*>/i)[1] ?? '');
  if (!headings.includes(contract.heading) || !body.includes(contract.copy) || html.includes('<!--$!-->')) {
    throw new Error(`Incomplete production HTML at ${page.path}: expected heading "${contract.heading}" and page copy; unfinished SSR boundary=${html.includes('<!--$!-->')}`);
  }
  if (page.path === '/fleet') {
    const registrations = ['N8570B', 'N4383P', 'N46201', 'N6717A', 'N6641F', 'N96150', 'N11059', 'N7108G'];
    let last = -1;
    for (const reg of registrations) {
      const at = body.indexOf(reg);
      if (at <= last) throw new Error(`Fleet production HTML missing/out of order: ${reg}`);
      last = at;
    }
  }
  console.info(`[ssr-html-ok] ${page.path} ${new TextEncoder().encode(html).length} bytes`);
}