import { useEffect } from "react";

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

let owners = 0;
let stop: (() => void) | null = null;

function start(): () => void {
  const root = document.documentElement;
  root.classList.add("story-phone");
  let points: number[] = [], end = Infinity, fingers = 0, startY = 0, startScroll = 0, idle = 0, on: boolean | null = null;
  const measure = () => {
    points = Array.from(document.querySelectorAll<HTMLElement>(".story-snap"))
      .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
      .sort((a, b) => a - b);
    end = points.length ? points[points.length - 1]! : Infinity;
  };
  const set = (v: boolean) => { if (v !== on) { on = v; root.classList.toggle("story-snapping", v); } };
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
    if (fingers > 0 || zoomed()) return;
    const y = window.scrollY;
    if (y >= end - 2) return;
    const p = nearestSnap(y, points);
    if (p === null) return;
    if (Math.abs(p - y) <= 2) { set(true); return; }
    window.scrollTo({ top: p, behavior: reduce() ? "instant" : "smooth" });
  };
  const onEnd = (e: TouchEvent) => { fingers = e.touches.length; if (!fingers) schedule(); };
  const schedule = () => { window.clearTimeout(idle); idle = window.setTimeout(settle, 180); };
  const onScroll = () => {
    if (fingers) return;
    // Free momentum from the content crossing back into the sections: lock so it stops at the first section it meets.
    if (on === false && !zoomed() && window.scrollY < end - 1) set(true);
    schedule();
  };

  measure();
  set(storySnapWanted(window.scrollY, end, false));
  const ro = new ResizeObserver(measure);
  ro.observe(document.body);
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("touchcancel", onEnd, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    ro.disconnect();
    window.clearTimeout(idle);
    window.removeEventListener("touchstart", onStart);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onEnd);
    window.removeEventListener("touchcancel", onEnd);
    window.removeEventListener("scroll", onScroll);
    root.classList.remove("story-snapping", "story-phone");
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
