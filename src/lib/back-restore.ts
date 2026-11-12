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
  currentKey ??= keyOf(window.history.state);
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

/** Put the page on the saved spot right now (snapping paused for the move). */
function place(snap: BackSnapshot): number {
  const root = document.documentElement;
  const points = anchors();
  const target = restoreTarget(snap, points, root.scrollHeight - window.innerHeight);
  const snapped = root.classList.contains("story-snapping");
  root.classList.remove("story-snapping");
  window.scrollTo({ top: target, behavior: "instant" });
  // Section locking applies above the content anchor only (same rule as story-snap.ts).
  const end = points.at(-1) ?? Infinity;
  if (root.classList.contains("story-phone") && (snapped || target < end - 1)) {
    requestAnimationFrame(() => root.classList.toggle("story-snapping", window.scrollY < end - 1));
  }
  return target;
}

async function restore(snap: BackSnapshot) {
  const mine = ++token;
  const root = document.documentElement;
  const home = snap.i >= 0 || Object.keys(snap.j).length > 0;
  if (home) {
    // The section format (stories or scrolling) must be known before positions mean anything
    // (already cached after the first visit, so this resolves at once on a normal return).
    const settings = await import("./use-site-settings");
    await Promise.race([
      Promise.all([settings.loadJourneyMode(), settings.loadDesktopJourneyMode()]),
      new Promise((r) => window.setTimeout(r, GATE_MAX_MS)),
    ]);
  }
  await frame(); // React has applied the format
  if (mine !== token) return;
  if (home) window.dispatchEvent(new CustomEvent(JOURNEY_RESTORE, { detail: snap.j }));
  const target = place(snap);
  window.dispatchEvent(new CustomEvent("journey-target", { detail: target }));
  journeys = { ...snap.j };
  pending = null;
  root.classList.remove("page-restoring");
  // Late layout (fonts, images) may still shift the sections a little: follow the saved spot for a
  // short while, and stop the moment the visitor touches, scrolls with a wheel or presses a key.
  let stopped = false;
  const stop = () => { stopped = true; };
  const opts = { passive: true, once: true } as const;
  window.addEventListener("touchstart", stop, opts);
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("keydown", stop, opts);
  const t0 = performance.now();
  const follow = () => {
    if (stopped || mine !== token || performance.now() - t0 > GATE_MAX_MS) {
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("keydown", stop);
      if (!stopped && mine === token) save();
      return;
    }
    const want = restoreTarget(snap, anchors(), root.scrollHeight - window.innerHeight);
    if (Math.abs(window.scrollY - want) > 2) place(snap);
    window.setTimeout(follow, 120);
  };
  window.setTimeout(follow, 120);
}

/** Browser only, once: own scroll restoration and pick up a full-page back/forward load. */
export function installBackRestore() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try { window.history.scrollRestoration = "manual"; } catch { /* ignore */ }
  // The first page starts recording right away (the router does not report a resolve on hydration).
  currentKey = keyOf(window.history.state);
  frozen = false;
  // A full page load from the back/forward buttons (no bfcache) restores too; reloads open at the top.
  const nav = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === "back_forward") {
    const k = keyOf(window.history.state);
    const snap = k ? load()[k] : undefined;
    if (snap && snap.path === window.location.pathname) {
      pending = snap;
      document.documentElement.classList.add("page-restoring");
      window.setTimeout(() => { if (pending === snap) runRestore(snap); }, 0);
    }
  }
  window.addEventListener("scroll", scheduleSave, { passive: true });
  window.addEventListener("pagehide", save);
}

/** History change (router.history.subscribe): only BACK/FORWARD/GO returns restore. */
export function backRestoreHistory(state: unknown, pathname: string, action: string) {
  if (action === "REPLACE") return; // router housekeeping on the same entry
  token++;
  if (action !== "BACK" && action !== "FORWARD" && action !== "GO") { pending = null; return; }
  const k = keyOf(state);
  const snap = k ? load()[k] : undefined;
  pending = snap && snap.path === pathname ? snap : null;
}

/** The returning page is about to appear: keep it hidden until it sits on the saved spot (the old page stays visible meanwhile). */
export function backRestoreMount() {
  if (pending) document.documentElement.classList.add("page-restoring");
}

/** A navigation is starting: save the page being left, then stop recording until the next one resolves. */
export function backRestoreLeave() { save(); frozen = true; }

/** The new page has resolved: start recording under its entry, and run a pending return. */
export function backRestoreResolved(state: unknown) {
  currentKey = keyOf(state) ?? keyOf(window.history.state);
  journeys = {};
  frozen = false;
  if (pending) runRestore(pending);
}

function runRestore(snap: BackSnapshot) {
  void restore(snap);
  // Never leave the page hidden if something goes wrong.
  window.setTimeout(() => { if (pending === snap) { pending = null; document.documentElement.classList.remove("page-restoring"); } }, GATE_MAX_MS + 800);
}

/** Restoring a back/forward return to this path (the router skips its own top reset / #hash landing). */
export function restoringPath(pathname: string): boolean { return pending?.path === pathname; }
