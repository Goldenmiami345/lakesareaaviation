import contracts from './prerender-contracts.json';
import { checkPrerenderHtml } from './prerender-check.mjs';

/**
 * Called with the actual production renderer's HTML, not a dev response.
 * Note: the Lovable build forces prerender.failOnError=false, so a throw here is only
 * logged. The build is actually failed by scripts/check-prerender-dist.mjs, which runs
 * after `vite build` and scans the written HTML files.
 */
export function verifyPrerender({ page, html }: { page: { path: string }; html: string }) {
  try {
    const bytes = checkPrerenderHtml(page.path, html, contracts);
    console.info(`[ssr-html-ok] ${page.path} ${bytes} bytes`);
  } catch (error) {
    console.error(`[ssr-html-fail] ${(error as Error).message}`);
    throw error;
  }
}
