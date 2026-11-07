import { useEffect } from "react";
import { PAGE_RETURN_START, pageReturnActive } from "./page-return";

/**
 * Phone Story mode: vertical movement between the homepage's full-screen sections is 100% native
 * scrolling (compositor thread) locked by CSS scroll snap (`html.story-snapping`, mandatory, every
 * `.story-snap` anchor has scroll-snap-stop: always), so one swipe moves exactly one section with
 * Safari's own physics. JavaScript never moves the page per finger frame; it only switches snapping
 * off below the last anchor (normal reading content) and finishes a rare rest between anchors.
 */

/** Should snapping be on? Above the last anchor yes; below it no; exactly on it, only when heading back up. */
export function storySnapWanted(y: number, end: number, headingUp: boolean): boolean {
  if (y < end - 1) return true;
  if (y > end + 1) return false;
  return headingUp;
}

/** Nearest anchor to a resting position (anchors sorted ascending). */
export function nearestSnap(y: number, points: number[]): number | null {
  let best: number | null = null;
  for (const p of points) if (best === null || Math.abs(p - y) < Math.abs(best - y)) best = p;
  return best;
}

/** Opening gate: section locking turns on only after fonts are ready and page height held still for 2 frames. */
export function storyOpeningSettled(quietFrames: number, fontsReady: boolean): boolean {
  return fontsReady && quietFrames >= 2;
}

let owners = 0;
let firstStartDone = false;
let stop: (() => void) | null = null;

function start(): () => void {
  const root = document.documentElement;
  root.classList.add("story-phone");
  let points: number[] = [], end = Infinity, fingers = 0, startY = 0, startScroll = 0, idle = 0, on: boolean | null = null;
  const measure = () => {
    points = Array.from(document.querySelectorAll<HTMLElement>(".story-snap"))
      .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
      .sort((a, b) => a - b);
    end = points.at(-1) ?? Infinity;
  };
  const set = (v: boolean) => { if (pageReturnActive()) return; on = v; root.classList.toggle("story-snapping", v); };
  const zoomed = () => root.classList.contains("journey-zoomed");
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Decide while a finger is down only: changing snap rules mid-momentum could retarget the glide.
  const onStart = (e: TouchEvent) => {
    fingers = e.touches.length;
    window.clearTimeout(idle);
    startY = e.touches[0]?.clientY ?? 0;
    startScroll = window.scrollY;
    if (!zoomed()) set(storySnapWanted(startScroll, end, false));
  };
  const onMove = (e: TouchEvent) => {
    if (zoomed()) return;
    const dy = (e.touches[0]?.clientY ?? startY) - startY; // finger moving down = page heading up
    const atEnd = Math.abs(startScroll - end) <= 1;
    if (atEnd && Math.abs(dy) > 6) set(dy > 0);
    else if (!on && window.scrollY < end - 1) set(true); // a slow drag from the content back into the sections
  };
  // A rest between anchors (Safari can stop a snap when a finger taps mid-glide, or free momentum
  // from the content lands inside the sections) glides to the nearest anchor, then locks again.
  const settle = () => {
    if (pageReturnActive() || fingers > 0 || zoomed()) return;
    const y = window.scrollY;
    if (y >= end - 2) return;
    const p = nearestSnap(y, points);
    if (p === null) return;
    if (Math.abs(p - y) <= 2) { set(true); return; }
    window.scrollTo({ top: p, behavior: reduce() ? "instant" : "smooth" });
  };
  const onEnd = (e: TouchEvent) => { fingers = e.touches.length; if (!fingers) schedule(); };
  const schedule = () => { window.clearTimeout(idle); if (!pageReturnActive()) idle = window.setTimeout(settle, 180); };
  const onScroll = () => {
    if (pageReturnActive() || fingers) return;
    // Free momentum from the content crossing back into the sections: lock so it stops at the first section it meets.
    if (on === false && !zoomed() && window.scrollY < end - 1) set(true);
    schedule();
  };

  measure();
  // Fresh page load: Safari restores the old scroll offset from the taller fading-scroll layout, and
  // mandatory snapping then lands on the nearest section (the Discovery Flight). Always open on the hero.
  let touched = false;
  // Every arrival on the homepage (reload, back button, link) opens on the hero unless a #hash asks otherwise.
  const fresh = !window.location.hash;
  firstStartDone = true;
  try { window.history.scrollRestoration = "manual"; } catch { /* ignore */ }
  // Single owner of the opening position: snapping stays OFF while the layout is still settling
  // (no timer fights snap), then one instant move to the top and snapping turns on.
  set(false);
  let lastH = -1, quiet = 0, armed = false, raf = 0;
  const arm = () => {
    if (armed) return;
    armed = true;
    cancelAnimationFrame(raf);
    measure();
    if (fresh && !touched) window.scrollTo({ top: 0, behavior: "instant" });
    set(storySnapWanted(window.scrollY, end, false));
  };
  if (fresh) window.scrollTo({ top: 0, behavior: "instant" });
  const watch = () => {
    const h = document.documentElement.scrollHeight;
    quiet = h === lastH ? quiet + 1 : 0;
    lastH = h;
    if (storyOpeningSettled(quiet, fontsReady)) arm(); else raf = requestAnimationFrame(watch);
  };
  let fontsReady = false;
  document.fonts?.ready.then(() => { fontsReady = true; }).catch(() => { fontsReady = true; });
  if (!document.fonts) fontsReady = true;
  raf = requestAnimationFrame(watch);
  const stopKeep = window.setTimeout(arm, 2500); // never leave sections unlocked
  const keepTop = 0;
  const markTouched = () => { touched = true; arm(); };
  window.addEventListener("touchstart", markTouched, { passive: true, once: true });
  window.addEventListener("wheel", markTouched, { passive: true, once: true });
  const ro = new ResizeObserver(measure);
  const onReturn = () => window.clearTimeout(idle);
  ro.observe(document.body);
  window.addEventListener(PAGE_RETURN_START, onReturn);
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("touchcancel", onEnd, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    ro.disconnect();
    window.removeEventListener(PAGE_RETURN_START, onReturn);
    window.clearTimeout(idle);
    window.clearInterval(keepTop);
    window.clearTimeout(stopKeep);
    window.removeEventListener("touchstart", markTouched);
    window.removeEventListener("wheel", markTouched);
    window.removeEventListener("touchstart", onStart);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onEnd);
    window.removeEventListener("touchcancel", onEnd);
    window.removeEventListener("scroll", onScroll);
    root.classList.remove("story-snapping", "story-phone");
    try { window.history.scrollRestoration = "auto"; } catch { /* ignore */ }
  };
}

/** Both homepage journeys call this; one shared controller runs while any of them is in phone Story mode. */
export function useStorySnap(active: boolean) {
  useEffect(() => {
    if (!active) return;
    owners += 1;
    if (owners === 1) stop = start();
    return () => {
      owners -= 1;
      if (owners === 0) { stop?.(); stop = null; }
    };
  }, [active]);
}
