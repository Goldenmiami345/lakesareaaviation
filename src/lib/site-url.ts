// Public site origin used by canonical links, og:url and the sitemap.
// When the school's own domain goes live, change ONLY this constant.
export const SITE_URL = "https://lakesareaaviation.lovable.app";

type LeafMatch = { fullPath?: string; params?: Record<string, unknown>; staticData?: { sitemap?: unknown } };

// Canonical path in the sitemap's exact form: the route's fullPath ("/programs/" keeps its slash)
// with params filled in. Routes outside the sitemap (noindex, admin, 404) get none.
export function canonicalUrl(leaf: LeafMatch | undefined): string | null {
  if (!leaf || leaf.staticData?.sitemap !== true || !leaf.fullPath) return null;
  const path = leaf.fullPath.replace(/\$([A-Za-z_]+)/g, (_, k: string) => encodeURIComponent(String(leaf.params?.[k] ?? "")));
  return new URL(path, SITE_URL).href;
}
