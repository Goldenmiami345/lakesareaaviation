// Admin "Preview on the site": the admin page shows real site pages in a small frame, with the
// admin's unsaved changes applied. The frame is recognised by its window name (set by the
// <iframe name>), reads the changes from this tab's sessionStorage on load and receives updates
// by postMessage, so nothing is saved and visitors never see it.
import type { RatesConfig } from "./rates-engine";
import type { Catalog } from "./catalog";

export const PREVIEW_FRAME = "lla-site-preview";
const KEY = "site-preview-v1";
const MSG = "lla-site-preview";

/** Full unsaved versions; anything left out shows what is published. */
export type PreviewState = { content?: Record<string, string>; rates?: RatesConfig; catalog?: Catalog };
export type PreviewPage = { label: string; path: string };

export const inPreviewFrame = () => typeof window !== "undefined" && window.name === PREVIEW_FRAME && window.top !== window.self;

export function readPreview(): PreviewState | null {
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); return s && typeof s === "object" ? s as PreviewState : null; } catch { return null; }
}
export function sendPreview(frame: Window | null | undefined, s: PreviewState) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  frame?.postMessage({ type: MSG, state: s }, window.location.origin);
}
export function onPreview(cb: (s: PreviewState) => void) {
  const h = (e: MessageEvent) => { if (e.origin === window.location.origin && e.source === window.parent && e.data?.type === MSG) cb(e.data.state as PreviewState); };
  window.addEventListener("message", h);
  return () => window.removeEventListener("message", h);
}

const uniq = (pages: PreviewPage[]) => pages.filter((p, i) => pages.findIndex(q => q.path === p.path) === i);
/** Every page an airplane shows up on. */
export const planePages = (reg: string, name?: string): PreviewPage[] => [
  { label: `Airplane page${name ? ` · ${name}` : ""}`, path: `/fleet/${reg.toLowerCase()}` },
  { label: "Fleet", path: "/fleet" },
  { label: "Rates", path: "/rates" },
];
export const programPages = (slug: string, name: string): PreviewPage[] => uniq([
  ...(slug ? [{ label: name || "Program page", path: `/programs/${slug}` }] : []),
  { label: "Programs", path: "/programs" },
  { label: "Accelerated training", path: "/accelerated-training" },
  { label: "Build my training plan", path: "/contact" },
]);
export const coursePages = (slug: string, name: string): PreviewPage[] => [
  ...(slug ? [{ label: name || "Course page", path: `/specialized-training/${slug}` }] : []),
  { label: "Specialized training", path: "/specialized-training" },
];
/** Prices: the rate sheet, fleet cards, every course whose total moves, and the plan builder. */
export const ratePages = (programs: { slug: string; name: string }[]): PreviewPage[] => uniq([
  { label: "Rates", path: "/rates" },
  ...programs.map(p => ({ label: p.name, path: `/programs/${p.slug}` })),
  { label: "Fleet", path: "/fleet" },
  { label: "Programs", path: "/programs" },
  { label: "Build my training plan", path: "/contact" },
]);
/** Words & photos list: the pages each changed spot appears on. */
export function contentPages(keys: string[], names: { programs: Record<string, string>; courses: Record<string, string> }): PreviewPage[] {
  const out: PreviewPage[] = [];
  for (const k of keys) {
    const [kind, slug] = k.split(".");
    if (kind === "course" && slug) out.push(...coursePages(slug, names.courses[slug] ?? "Course page"));
    else if (kind === "program" && slug) out.push({ label: names.programs[slug] ?? "Program page", path: `/programs/${slug}` }, { label: "Programs", path: "/programs" });
    else if (kind === "testimonial") out.push({ label: "Student success", path: "/student-success" }, { label: "Home", path: "/" });
  }
  return uniq(out.length ? out : [{ label: "Home", path: "/" }, { label: "Programs", path: "/programs" }, { label: "Specialized training", path: "/specialized-training" }]);
}
