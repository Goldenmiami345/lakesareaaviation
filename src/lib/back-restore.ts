/**
 * Back/forward buttons return a visitor to exactly where they were: the scroll position and, on the
 * homepage, the section plus the story page each swipe journey was showing. Positions are stored per
 * history entry (TanStack's __TSR_key) in sessionStorage. Homepage positions are saved relative to the
 * nearest .story-snap anchor so they survive small layout differences between visits.
 */
export type JourneyMark = { a: number; i: boolean };
export type BackSnapshot = { path: string; y: number; i: number; off: number; j: Record<string, JourneyMark> };

export const JOURNEY_RESTORE = "journey:restore";
const STORE = "back-restore-v1";
const MAX_ENTRIES = 40;
const GATE_MAX_MS = 1500;

/** Position relative to the last anchor at or above y (anchors sorted ascending, document px). */
export function anchorPosition(y: number, anchors: number[]): { i: number; off: number } {
  let i = -1;
  anchors.forEach((top, k) => { if (top <= y + 2) i = k; });
  return { i, off: i >= 0 ? y - (anchors[i] as number) : y };
}

/** Where a saved snapshot lands now: same anchor + offset when the anchor still exists, else the raw y. */
export function restoreTarget(s: Pick<BackSnapshot, "y" | "i" | "off">, anchors: number[], maxY: number): number {
  const base = s.i >= 0 && s.i < anchors.length ? (anchors[s.i] as number) + s.off : s.y;
  return Math.max(0, Math.min(Math.round(base), Math.max(0, maxY)));
}

/** Keep only the newest entries (insertion order) so the store never grows without bound. */
export function trimEntries<T>(store: Record<string, T>, max = MAX_ENTRIES): Record<string, T> {
  const keys = Object.keys(store);
  if (keys.length <= max) return store;
  const out: Record<string, T> = {};
  for (const k of keys.slice(keys.length - max)) out[k] = store[k] as T;
  return out;
}

let store: Record<string, BackSnapshot> | null = null;
let currentKey: string | null = null;
let frozen = true; // until the first page has resolved, and between leaving a page and the next one resolving
let journeys: Record<string, JourneyMark> = {};
let pending: BackSnapshot | null = null;
let token = 0;
let saveTimer = 0;
let installed = false;

const load = (): Record<string, BackSnapshot> => {
  if (store) return store;
  try { store = JSON.parse(sessionStorage.getItem(STORE) ?? "{}") as Record<string, BackSnapshot>; } catch { store = {}; }
  return store ?? {};
};
const persist = () => {
  const s = trimEntries(load());
  store = s;
  try { sessionStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ }
};
const anchors = () => Array.from(document.querySelectorAll<HTMLElement>(".story-snap"))
  .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
  .sort((a, b) => a - b);

/** Record the page's current position under its own history entry. */
function save() {
  window.clearTimeout(saveTimer);
  if (frozen || !currentKey || pending) return;
  const y = Math.round(window.scrollY);
  const s = load();
  delete s[currentKey]; // re-insert so it counts as newest
  s[currentKey] = { path: window.location.pathname, y, ...anchorPosition(y, anchors()), j: { ...journeys } };
  persist();
}
const scheduleSave = () => { window.clearTimeout(saveTimer); if (!frozen) saveTimer = window.setTimeout(save, 150); };

export function backRestorePending(): boolean { return pending !== null; }

/** Homepage journeys report their current story page so a return can show the same one. */
export function reportJourney(id: string, active: number, interacted: boolean) {
  if (frozen || pending) return;
  journeys[id] = { a: active, i: interacted };
  scheduleSave();
}

const keyOf = (state: unknown) => {
  const st = state as { __TSR_key?: string; key?: string } | null | undefined;
  return st?.__TSR_key ?? st?.key ?? null;
};
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function restore(snap: BackSnapshot) {
  const mine = ++token;
  const root = document.documentElement;
  const t0 = performance.now();
  const home = snap.i >= 0 || Object.keys(snap.j).length > 0;
  if (home) {
    // The section format (stories or scrolling) must be known before positions mean anything.
    const settings = await import("./use-site-settings");
    await Promise.race([
      Promise.all([settings.loadJourneyMode(), settings.loadDesktopJourneyMode()]),
      new Promise((r) => window.setTimeout(r, GATE_MAX_MS)),
    ]);
  }
  let fonts = !document.fonts;
  document.fonts?.ready.then(() => { fonts = true; }).catch(() => { fonts = true; });
  // Layout settles: fonts ready and page height still for 3 frames (capped so it never hangs).
  let lastH = -1, quiet = 0;
  while (performance.now() - t0 < GATE_MAX_MS) {
    await frame();
    if (mine !== token) return;
    const h = root.scrollHeight;
    quiet = h === lastH ? quiet + 1 : 0;
    lastH = h;
    if (fonts && quiet >= 3) break;
  }
  if (mine !== token) return;
  if (home) window.dispatchEvent(new CustomEvent(JOURNEY_RESTORE, { detail: snap.j }));
  const points = anchors();
  const target = restoreTarget(snap, points, root.scrollHeight - window.innerHeight);
  const snapped = root.classList.contains("story-snapping");
  root.classList.remove("story-snapping");
  window.scrollTo({ top: target, behavior: "instant" });
  await frame();
  await frame();
  if (mine !== token) return;
  if (Math.abs(window.scrollY - target) > 2) window.scrollTo({ top: target, behavior: "instant" });
  // Section locking applies above the content anchor only (same rule as story-snap.ts).
  const end = points.at(-1) ?? Infinity;
  if (root.classList.contains("story-phone") && (snapped || target < end - 1)) root.classList.toggle("story-snapping", target < end - 1);
  window.dispatchEvent(new CustomEvent("journey-target", { detail: target }));
  journeys = { ...snap.j };
  pending = null;
  root.classList.remove("page-restoring");
  save();
}

type RouterLike = {
  history: { subscribe: (fn: (e: { location: { state: unknown; pathname: string }; action: { type: string } }) => void) => () => void };
  subscribe: (event: "onBeforeNavigate" | "onResolved", fn: (e: { toLocation: { state: unknown; pathname: string } }) => void) => () => void;
};

/** Wire into the router once (browser only). */
export function installBackRestore(router: RouterLike) {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try { window.history.scrollRestoration = "manual"; } catch { /* ignore */ }
  // A full page load from the back/forward buttons (no bfcache) restores too; reloads open at the top.
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "back_forward") {
    const k = keyOf(window.history.state);
    const snap = k ? load()[k] : undefined;
    if (snap && snap.path === window.location.pathname) pending = snap;
  }
  router.history.subscribe(({ location, action }) => {
    if (action.type !== "BACK" && action.type !== "FORWARD" && action.type !== "GO") { pending = null; token++; return; }
    const k = keyOf(location.state);
    const snap = k ? load()[k] : undefined;
    pending = snap && snap.path === location.pathname ? snap : null;
    token++;
    if (pending) document.documentElement.classList.add("page-restoring");
  });
  router.subscribe("onBeforeNavigate", () => { save(); frozen = true; });
  router.subscribe("onResolved", ({ toLocation }) => {
    currentKey = keyOf(toLocation.state) ?? keyOf(window.history.state);
    journeys = {};
    frozen = false;
    if (pending) {
      const snap = pending;
      void restore(snap);
      // Never leave the page hidden if something goes wrong.
      window.setTimeout(() => { document.documentElement.classList.remove("page-restoring"); if (pending === snap) pending = null; }, GATE_MAX_MS + 800);
    }
  });
  window.addEventListener("scroll", scheduleSave, { passive: true });
  window.addEventListener("pagehide", save);
}

/** Restoring a back/forward return to this path (the router skips its own top reset / #hash landing). */
export function restoringPath(pathname: string): boolean { return pending?.path === pathname; }
