import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyStop, JOURNEY_STAGE_SVH, pageStep, nearestPage, currentPage, type JourneyPage, type PageSegment } from "../lib/journey-pacing";
import { airportTraffic, SCHOOL_PHONE_TEL } from "../lib/site-data";
import type { PatternAirport } from "../lib/traffic-pattern";
import { TrafficPattern } from "./traffic-pattern";
import { TrafficPerspective } from "./traffic-perspective";
import airlineVideo from "../assets/journey/airline-approach.mp4.asset.json";
import clouds from "../assets/journey/01-clouds.webp";
import runway from "../assets/journey/02-runway-corrected.webp";
import instrument from "../assets/journey/instrument-imc-cockpit.webp";
import instructor from "../assets/journey/04-instructor.webp";
import airline from "../assets/journey/05-airline.webp";
import lf from "../assets/journey/loc-little-falls.webp";
import fl from "../assets/journey/loc-fort-lupton.webp";
import cw from "../assets/journey/loc-cottonwood.webp";
import commercial from "../assets/photos/sunset-ramp.webp";
// Phone-only portrait variants: photos extended with AI fill around untouched original pixels;
// airport aerials widened with more real USGS NAIP imagery at the same scale and centre.
import cloudsPhone from "../assets/journey/01-clouds-phone.webp";
import runwayPhone from "../assets/journey/02-runway-corrected-phone.webp";
import instrumentPhone from "../assets/journey/instrument-imc-cockpit-phone.webp";
import instructorPhone from "../assets/journey/04-instructor-phone.webp";
import commercialPhone from "../assets/photos/sunset-ramp-phone.webp";
import lfPhone from "../assets/journey/loc-little-falls-phone.webp";
import flPhone from "../assets/journey/loc-fort-lupton-phone.webp";
import cwPhone from "../assets/journey/loc-cottonwood-phone.webp";

const PHONE_MQ = "(max-width: 639px)";
function useIsPhone() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(PHONE_MQ); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(PHONE_MQ).matches,
    () => false,
  );
}
// Overlay viewBox (in the original image's pixel space) covering the whole phone canvas.
const AERIAL_PHONE_VIEW = "-100 -950 1700 3400";

type Stage = { code: string; label: string; time: string; title: string; text: string; img: string; alt: string; cta: string; slug?: string; location?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number; video?: string; position?: string; traffic?: PatternAirport; perspective?: boolean; phoneImg?: string; phoneView?: string };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", text: "Left seat, instructor beside you.", img: clouds, phoneImg: cloudsPhone, alt: "Sunrise above a sea of clouds", cta: "Book an intro flight", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", text: "One focused block.", img: runway, phoneImg: runwayPhone, phoneView: "0 -700 1376 1468", alt: "Oblique view of Little Falls (KLXL): runway 13/31 with the full-length runway 18/36 crossing near the runway 13 end", cta: "Private pilot details", slug: "private-pilot", perspective: true, w: 1376, h: 768 },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Train in the real cockpit.", text: "Fly by reference to instruments.", img: instrument, phoneImg: instrumentPhone, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", position: "center", zoom: 0.2, zoomIn: 0.03 },
  { code: "04", label: "Commercial pilot", time: "5–7 days", title: "Fly professionally.", text: "Commercial standards in a focused block.", img: commercial, phoneImg: commercialPhone, alt: "Lakes Area Aviation airplanes on the ramp at sunset", cta: "Commercial details", slug: "commercial-single-engine" },
  { code: "05", label: "CFI & CFII", time: "4–6 weeks", title: "Become the instructor.", text: "The exams: 1-hour oral and 1-hour flight.", img: instructor, phoneImg: instructorPhone, alt: "Instructor and student inspecting a training airplane before flight", cta: "CFI & CFII track", slug: "cfi-cfii", position: "center" },
  { code: "06", label: "The right seat", time: "Your goal", title: "Build toward the airline flight deck.", text: "Every instructing hour moves you closer.", img: airline, alt: "Airline flight deck at night on final approach over city lights", cta: "Build my training plan", to: "/contact", video: airlineVideo.url, zoom: 0.2, zoomIn: 0.03 },
];

export const airportStages: Stage[] = [
  { code: "MN", label: "Little Falls", hud: "KLXL · 13129 Airport Rd", time: "KLXL", title: "Little Falls, Minnesota.", text: "Little Falls/Morrison County Airport", img: lf, phoneImg: lfPhone, phoneView: AERIAL_PHONE_VIEW, alt: "USGS aerial of Little Falls/Morrison County Airport (KLXL), updated to show paved runways 13/31 and 18/36", cta: "Build my training plan", location: "KLXL", w: 1500, h: 1500, zoom: 0.4, zoomIn: 0.04, traffic: airportTraffic.KLXL },
  { code: "CO", label: "Fort Lupton", hud: "18V · 7507 Co Rd 39", time: "18V", title: "Fort Lupton, Colorado.", text: "Platte Valley Airpark", img: fl, phoneImg: flPhone, phoneView: AERIAL_PHONE_VIEW, alt: "Public-domain USGS aerial photo of Platte Valley Airpark (18V) runway, hangars and surrounding Colorado farm fields", cta: "Build my training plan", location: "18V", w: 1500, h: 1500, zoom: 0.12, zoomIn: 0.02, traffic: airportTraffic["18V"] },
  { code: "AZ", label: "Cottonwood", hud: "P52 · 1001 W Mingus Ave", time: "P52", title: "Cottonwood, Arizona.", text: "Cottonwood Municipal Airport", img: cw, phoneImg: cwPhone, phoneView: AERIAL_PHONE_VIEW, alt: "Public-domain USGS aerial photo of Cottonwood Municipal Airport (P52) runway 14/32, ramp and surrounding Verde Valley terrain", cta: "Build my training plan", location: "P52", w: 1500, h: 1500, zoom: 0.18, zoomIn: 0.03, traffic: airportTraffic.P52 },
];

// Traffic-pattern airplanes on the airport aerials.
const SHOW_TRAFFIC = true;

// Programmatic glide that temporarily disables journey snapping, so jumps
// (back to top, location shortcuts) travel straight to their target.
export function glideTo(top: number, instant = false) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("journey-free");
  let done = false;
  const finish = () => { if (done) return; done = true; root.classList.remove("journey-free"); window.removeEventListener("scrollend", finish); };
  window.addEventListener("scrollend", finish);
  window.setTimeout(finish, 2200);
  window.scrollTo({ top, behavior: reduce || instant ? "instant" : "smooth" });
  if (instant) window.requestAnimationFrame(finish);
}

// Instant jump to the very top (logo / Home tapped while already on "/"):
// drop any engaged snap first so mandatory snapping can't pull the page onto a stop.
export function jumpToPageTop() {
  const root = document.documentElement;
  root.classList.add("journey-free");
  cancelAnimationFrame(tweenFrame); paging = false; root.classList.remove("journey-paging");
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    root.classList.remove("journey-free");
  }));
}


// ---- One swipe = one page ----
// Inside the home journeys we page ourselves instead of native snap: iOS only
// advances a mandatory snap past a distance/velocity threshold, so gentle
// swipes sprang back. Any swipe past PAGE_SWIPE_PX, or any fresh wheel
// notch, animates to the adjacent page; input is ignored until it lands.
const PAGE_SWIPE_PX = 8;
const PAGE_MS = 500;
const journeys = new Map<HTMLElement, { n: number; vh: () => number }>();
let paging = false;
let pagingUntil = 0;
// After a glide lands, leftover native scroll deltas from the same swipe (queued by
// the browser while touch moves were cancelled) are pulled back onto the landed page.
let landedY = -1;
let landedUntil = 0;
let tweenFrame = 0;
let controllerRefs = 0;
let removeController: (() => void) | null = null;

function journeyPages(): JourneyPage[] {
  const list = [...journeys].sort((a, b) => a[0].offsetTop - b[0].offsetTop);
  if (!list.length) return [];
  const pages: JourneyPage[] = [{ y: 0 }];
  let after = 0;
  for (const [el, { n, vh }] of list) {
    const base = window.scrollY + el.getBoundingClientRect().top;
    const total = Math.max(1, el.offsetHeight - vh());
    for (let i = 0; i < n; i += 1) pages.push(i === n - 1 ? { y: Math.round(base + total * journeyStop(i, n)), hold: Math.round(base + total) } : { y: Math.round(base + total * journeyStop(i, n)) });
    after = Math.round(base + el.offsetHeight);
  }
  pages.push({ y: after });
  return pages;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function runPath(path: PageSegment[], touch = false) {
  cancelAnimationFrame(tweenFrame);
  paging = true;
  // A touch swipe can leave a native fling running (iOS/Chromium mark later touchmoves
  // non-cancelable once scrolling starts); freezing native scroll during our glide
  // stops it from fighting the tween and overshooting several pages.
  if (touch) document.documentElement.classList.add("journey-paging");
  const moving = path.filter((s) => !s.instant).length || 1;
  const dur = PAGE_MS / moving;
  let k = 0;
  const nextSeg = () => {
    const seg = path[k++];
    if (!seg) {
      // Late layout shifts (images/fonts on a cold load) can move pages while we glide;
      // land exactly on the nearest real page so the next swipe starts from a clean state.
      const pages = journeyPages();
      if (pages.length && currentPage(pages, window.scrollY) < 0) {
        const p = pages[nearestPage(pages, window.scrollY)];
        if (p) window.scrollTo({ top: p.y, behavior: "instant" });
      }
      paging = false; pagingUntil = performance.now() + 60;
      landedY = window.scrollY; landedUntil = performance.now() + 700;
      document.documentElement.classList.remove("journey-paging");
      return;
    }
    if (seg.instant) { window.scrollTo({ top: seg.y, behavior: "instant" }); nextSeg(); return; }
    const from = window.scrollY, start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      window.scrollTo({ top: from + (seg.y - from) * easeOut(t), behavior: "instant" });
      if (t < 1) tweenFrame = requestAnimationFrame(tick); else nextSeg();
    };
    tweenFrame = requestAnimationFrame(tick);
  };
  nextSeg();
}

export function goToJourneyPage(y: number, instant = false) {
  if (instant) { cancelAnimationFrame(tweenFrame); paging = false; document.documentElement.classList.remove("journey-paging"); window.scrollTo({ top: y, behavior: "instant" }); return; }
  runPath([{ y, instant: false }]);
}

function installController() {
  controllerRefs += 1;
  if (import.meta.env.DEV) (window as unknown as { __journeyPages?: () => JourneyPage[] }).__journeyPages = journeyPages;
  if (removeController) return;
  const root = document.documentElement;
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const busy = () => paging || performance.now() < pagingUntil;
  const inRange = (pages: JourneyPage[]) => pages.length > 0 && window.scrollY <= pages[pages.length - 1]!.y + 2;
  const step = (dir: 1 | -1, touch = false) => {
    const path = pageStep(journeyPages(), window.scrollY, dir);
    if (!path) return false;
    runPath(path, touch);
    return true;
  };
  let lastWheel = 0, lastDelta = 0;
  const onWheel = (e: WheelEvent) => {
    if (reduce() || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || root.classList.contains("journey-free")) return;
    const pages = journeyPages();
    if (!inRange(pages)) return;
    const now = performance.now(), delta = Math.abs(e.deltaY);
    const fresh = now - lastWheel > 200 || delta > lastDelta * 1.6 + 4;
    lastWheel = now; lastDelta = delta;
    const dir = e.deltaY > 0 ? 1 : -1;
    if (busy() || !fresh) { if (pageStep(pages, window.scrollY, dir) || busy()) e.preventDefault(); return; }
    if (step(dir)) e.preventDefault();
  };
  let g: { x: number; y: number; decided: boolean; claimed: boolean; fired: boolean } | null = null;
  let touching = false;
  let rejected = false;
  // touchend can be dropped when the main thread is busy; a finger with no touch
  // events for 150ms is treated as lifted so the landing guard and settling still run.
  let lastTouchAt = 0;
  const fingerDown = () => touching && performance.now() - lastTouchAt < 150;
  // Hero → Discovery and The Right Seat → Little Falls follow the finger 1:1, then
  // complete (or spring back) on release; every other step fires a glide at 8px.
  let follow: { base: number; target: number; dy: number; max: number } | null = null;
  let followTimer = 0;
  const releaseFollow = () => {
    window.clearTimeout(followTimer);
    const f = follow; follow = null;
    if (!f) return;
    paging = false;
    const go = f.dy >= PAGE_SWIPE_PX && f.dy >= f.max - 24;
    runPath([{ y: go ? f.target : f.base, instant: false }], true);
  };
  const followable = (pages: JourneyPage[], j: number) => j === 0 || (pages[j]?.hold !== undefined && j + 2 < pages.length);
  const onTouchStart = (e: TouchEvent) => {
    touching = true; rejected = false; landedUntil = 0; lastTouchAt = performance.now();
    const t = e.touches[0];
    g = e.touches.length === 1 && t && !reduce() ? { x: t.clientX, y: t.clientY, decided: false, claimed: false, fired: false } : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    lastTouchAt = performance.now();
    const t = e.touches[0];
    // A finger that went down before the handler attached (first load) is adopted here.
    if (!g && !rejected && t && e.touches.length === 1 && !reduce()) { touching = true; g = { x: t.clientX, y: t.clientY, decided: false, claimed: false, fired: false }; return; }
    if (!g || !t || e.touches.length !== 1) { g = null; rejected = true; return; }
    const dx = g.x - t.clientX, dy = g.y - t.clientY;
    if (!g.decided) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // taps with jitter stay taps
      g.decided = true;
      if (Math.abs(dx) > Math.abs(dy) || root.classList.contains("journey-free")) { g = null; rejected = true; return; }
      const pages = journeyPages();
      g.claimed = inRange(pages) && (busy() || !!pageStep(pages, window.scrollY, dy > 0 ? 1 : -1));
      if (!g.claimed) { g = null; rejected = true; return; }
    }
    if (e.cancelable) e.preventDefault();
    if (!g.fired && !busy() && dy > 0 && !follow) {
      const pages = journeyPages();
      const j = currentPage(pages, window.scrollY);
      const path = j >= 0 && followable(pages, j) ? pageStep(pages, window.scrollY, 1) : null;
      const target = path?.[path.length - 1]?.y;
      if (path && target !== undefined) {
        g.fired = true;
        const base = path.length > 1 ? path[0]!.y : window.scrollY;
        cancelAnimationFrame(tweenFrame);
        paging = true; root.classList.add("journey-paging");
        follow = { base, target, dy: 0, max: 0 };
      }
    }
    if (follow) {
      follow.dy = dy; follow.max = Math.max(follow.max, dy);
      window.scrollTo({ top: Math.max(follow.base, Math.min(follow.target, follow.base + dy)), behavior: "instant" });
      window.clearTimeout(followTimer);
      followTimer = window.setTimeout(releaseFollow, 350);
      return;
    }
    if (!g.fired && !busy() && Math.abs(dy) >= PAGE_SWIPE_PX) { g.fired = true; step(dy > 0 ? 1 : -1, true); }
  };
  let settleTimer = 0;
  const onTouchEnd = (e: TouchEvent) => { if (e.touches.length === 0) { touching = false; g = null; releaseFollow(); scheduleSettle(); } };
  // Native momentum arriving from below stops at the exit page; anything left
  // resting between pages (keyboard, scrollbar) settles onto the nearest one.
  let lastY = window.scrollY;
  const scheduleSettle = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (fingerDown() || busy() || reduce() || root.classList.contains("journey-free")) return;
      const pages = journeyPages();
      if (!inRange(pages) || currentPage(pages, window.scrollY) >= 0) return;
      const p = pages[nearestPage(pages, window.scrollY)];
      if (p) runPath([{ y: p.y, instant: false }]);
    }, 180);
  };
  const onScroll = () => {
    const y = window.scrollY;
    if (!paging && !fingerDown() && performance.now() < landedUntil && Math.abs(y - landedY) > 1) { window.scrollTo({ top: landedY, behavior: "instant" }); lastY = landedY; return; }
    if (!busy() && !fingerDown() && !reduce() && !root.classList.contains("journey-free")) {
      const pages = journeyPages();
      const exit = pages[pages.length - 1]?.y;
      if (exit !== undefined && lastY >= exit - 1 && y < exit - 1) { window.scrollTo({ top: exit, behavior: "instant" }); lastY = exit; return; }
    }
    lastY = y;
    scheduleSettle();
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  removeController = () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(settleTimer);
    window.clearTimeout(followTimer);
    cancelAnimationFrame(tweenFrame);
    paging = false;
    root.classList.remove("journey-paging");
  };
}

function uninstallController() {
  controllerRefs -= 1;
  if (controllerRefs <= 0 && removeController) { removeController(); removeController = null; controllerRefs = 0; }
}

export function jumpToJourney(id: string, index: number) {
  window.dispatchEvent(new CustomEvent("journey:jump", { detail: { id, index } }));
}

type Props = { stages?: Stage[]; id?: string; label?: string; mode?: "alt" | "code"; fadeBottom?: "ink" | "background" };

export function FlightJourney({ stages = journeyStages, id = "flight-path", label = "Your accelerated flight path", mode = "alt", fadeBottom = "ink" }: Props = {}) {
  const fadeTopRef = useRef<HTMLDivElement>(null);
  const fadeBottomRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hudRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mx = 0, my = 0, frame = 0, last = -1;
    let shown: number | null = null;
    let prevTime = 0;
    const n = stages.length;
    const render = (now: number = performance.now()) => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const total = Math.max(1, el.offsetHeight - viewportHeight);
      const scrolled = journeyFrame(-rect.top / total, n);
      if (fadeTopRef.current) fadeTopRef.current.style.opacity = Math.max(0, Math.min(1, rect.top / (viewportHeight * 0.6))).toFixed(3);
      if (fadeBottomRef.current) fadeBottomRef.current.style.opacity = Math.max(0, Math.min(1, (viewportHeight - rect.bottom) / (viewportHeight * 0.6))).toFixed(3);
      // Native snap glides are quick; ease a continuous "slide position" toward the
      // scroll so slides zoom and crossfade into each other over about a second.
      const target = scrolled.stage + scrolled.transition;
      const dt = prevTime ? Math.min(64, now - prevTime) : 16;
      prevTime = now;
      if (shown === null || reduce || Math.abs(target - shown) > 2) shown = target;
      else shown += (target - shown) * (1 - Math.exp(-dt / 320));
      if (Math.abs(target - shown) < 0.002) shown = target;
      if (shown !== target) frame = requestAnimationFrame(render);
      else prevTime = 0;
      const base = Math.min(n - 1, Math.floor(shown));
      const t = Math.max(0, Math.min(1, shown - base));
      const state = { stage: base, next: Math.min(n - 1, base + 1), transition: t, active: t < 0.5 ? base : Math.min(n - 1, base + 1), copyOpacity: Math.abs(1 - 2 * t), progress: scrolled.progress };
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const st = stages[i];
        const leaving = i === state.stage ? state.transition : 0;
        const coming = i === state.next && i !== state.stage ? 1 - state.transition : 0;
        const scale = reduce ? 1 : 1 + leaving * (st?.zoom ?? 0.55) + coming * (st?.zoomIn ?? 0.06);
        const opacity = i === state.stage ? 1 - state.transition : i === state.next ? 1 : 0;
        const depth = reduce ? 0 : 10 + i * 3;
        layer.style.transform = `translate3d(${(mx * -depth).toFixed(2)}px, ${(my * -depth).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        layer.style.opacity = opacity.toFixed(3);
        layer.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      });
      if (copyRef.current) {
        copyRef.current.style.opacity = reduce ? "1" : state.copyOpacity.toFixed(3);
        copyRef.current.style.transform = reduce ? "none" : `translate3d(0, ${((1 - state.copyOpacity) * 8).toFixed(2)}px, 0)`;
      }
      if (hudRef.current) hudRef.current.textContent = Math.round(state.progress * 35000).toLocaleString("en-US");
      if (barRef.current) barRef.current.style.transform = `scaleY(${state.progress})`;
      const idx = state.active;
      if (idx !== last) {
        last = idx;
        setActive(idx);
        videoRefs.current.forEach((video, videoIndex) => {
          if (!video) return;
          if (videoIndex === idx && !reduce) void video.play().catch(() => undefined);
          else video.pause();
        });
      }
    };
    const renderScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; renderScroll(); };
    const el = sectionRef.current;
    const vh = () => viewportRef.current?.offsetHeight ?? window.innerHeight;
    if (el) journeys.set(el, { n, vh });
    installController();
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number; animate?: boolean }>).detail;
      if (d?.id !== id || !el) return;
      const page = journeyPages().find((p, k, all) => k > 0 && Math.abs(p.y - (window.scrollY + el.getBoundingClientRect().top + Math.max(1, el.offsetHeight - vh()) * journeyStop(d.index, n))) < 3) ;
      const y = page?.y ?? Math.round(window.scrollY + el.getBoundingClientRect().top + Math.max(1, el.offsetHeight - vh()) * journeyStop(d.index, n));
      goToJourneyPage(y, !d.animate);
    };
    render();
    window.addEventListener("scroll", renderScroll, { passive: true });
    window.addEventListener("resize", renderScroll);
    window.addEventListener("journey:jump", onJump);
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      if (el) journeys.delete(el);
      uninstallController();
      window.removeEventListener("journey:jump", onJump);
      window.removeEventListener("scroll", renderScroll);
      window.removeEventListener("resize", renderScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, [stages, id]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    videoRefs.current.forEach((video, videoIndex) => {
      if (!video) return;
      if (videoIndex === active && !reduce) void video.play().catch(() => undefined);
      else video.pause();
    });
    // Decode the next/previous stage images before they can become visible.
    layerRefs.current.forEach((layer, i) => {
      if (Math.abs(i - active) > 1) return;
      const img = layer?.querySelector("img");
      if (img) void img.decode().catch(() => undefined);
    });
  }, [active]);

  const jump = (i: number) => jumpToJourney(id, i);

  const isPhone = useIsPhone();
  const s = stages[active] ?? stages[0];
  if (!s) return null;
  return (
    <section ref={sectionRef} data-journey-section="" id={id} aria-label={label} className="relative bg-ink text-background" style={{ height: `${stages.length * JOURNEY_STAGE_SVH + 100}svh` }}>
      {stages.map((st, i) => (
        <div key={`stop-${st.code}`} aria-hidden className="journey-stop journey-stop-page pointer-events-none absolute left-0 h-px w-px" style={{ top: `${journeyStop(i, stages.length) * stages.length * JOURNEY_STAGE_SVH}svh` }} />
      ))}
      <div ref={viewportRef} className="sticky top-0 h-svh overflow-hidden">
        {stages.map((st, i) => (
          <div key={st.code} ref={(el) => { layerRefs.current[i] = el; }} className="journey-layer absolute -inset-[2%] bg-ink will-change-transform backface-hidden" style={{ zIndex: stages.length - i }}>
            {st.video ? (
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={st.video}
                poster={st.img}
                aria-label={st.alt}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full bg-ink object-cover"
                style={{ objectPosition: st.position ?? "center" }}
              />
            ) : (
              <picture className="block h-full w-full">
                {st.phoneImg && <source media={PHONE_MQ} srcSet={st.phoneImg} />}
                <img src={st.img} alt={st.alt} width={st.w ?? 1920} height={st.h ?? 1088} loading={i <= active + 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full bg-ink object-cover" style={{ objectPosition: st.position ?? "center" }} />
              </picture>
            )}
            {SHOW_TRAFFIC && st.traffic && <TrafficPattern airport={st.traffic} active={i === active} {...(isPhone && st.phoneView ? { viewBox: st.phoneView } : {})} />}
            {st.perspective && <TrafficPerspective active={i === active} {...(isPhone && st.phoneView ? { viewBox: st.phoneView } : {})} />}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/50" />
        <div className="journey-grain pointer-events-none absolute inset-0 z-10" />
        <div ref={fadeTopRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-ink" style={{ opacity: 0 }} />
        <div ref={fadeBottomRef} aria-hidden className={`pointer-events-none absolute inset-0 z-40 ${fadeBottom === "background" ? "bg-background" : "bg-ink"}`} style={{ opacity: 0 }} />

        {/* HUD */}
        <div className="journey-hud absolute left-5 top-24 z-20 font-mono text-[11px] uppercase tracking-[0.2em] text-background/70 lg:left-8">
          {mode === "alt" ? <p>Alt <span ref={hudRef} className="tabular-nums text-background">0</span> ft</p> : <><p className="text-background">{s.hud}</p>{s.traffic && <p className="mt-1 hidden sm:block">RWY {s.traffic.runway} · {s.traffic.side} traffic · TPA {(s.traffic.elevation + s.traffic.tpaAgl).toLocaleString("en-US")} MSL</p>}</>}
          <p className="mt-1 hidden sm:block">Stage {s.code} / 0{stages.length}</p>
        </div>

        {/* Stage rail */}
        <nav aria-label={`${label} stages`} className="absolute right-4 top-1/2 z-30 flex -translate-y-1/2 items-stretch gap-4 lg:right-8">
          <div className="journey-stage-rail relative w-px overflow-hidden bg-background/20">
            <div ref={barRef} className="absolute inset-0 origin-top bg-primary" style={{ transform: "scaleY(0)" }} />
            <span aria-hidden="true" className="landing-scroll-stroke absolute inset-x-0 top-0 h-8 bg-background" />
          </div>
          <ol className="flex flex-col justify-between gap-1 sm:gap-3">
            {stages.map((st, i) => (
              <li key={st.code}>
                <Button variant="ghost" type="button" aria-label={st.label} aria-current={i === active ? "step" : undefined} onClick={() => jump(i)} className={`group h-11 min-w-11 justify-start gap-3 rounded-none px-2 text-left text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-transparent ${i === active ? "outlined-accent-label" : "text-background/55 hover:text-background/80"}`}>
                  <span className={`size-2 rounded-full border border-current transition-all ${i === active ? "scale-150 bg-primary border-primary" : ""}`} />
                  <span className="hidden sm:inline">{st.label}</span>
                </Button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Copy */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto max-w-7xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pr-14 sm:pb-24 md:pb-12 lg:px-8 lg:pb-16">
          <div ref={copyRef} className="journey-copy max-w-2xl">
            <p className="stage-label max-sm:tracking-[0.18em]"><span className="max-sm:hidden">{s.code} · </span>{s.label}<span className="sm:hidden"> · {s.time}</span></p>
            <p className="mt-2 hidden font-display text-5xl leading-none sm:block">{s.time}</p>
            <h2 className="mt-1.5 font-display text-lg leading-[1.1] min-[380px]:text-xl sm:mt-2 sm:text-2xl">{s.title}</h2>
            <p className="mt-1 max-w-lg text-pretty text-sm leading-snug text-background/80 sm:mt-2 sm:text-base">{s.text}</p>
            <div className="flex flex-wrap items-end gap-2">
            {s.location
              ? <Link to="/contact" search={{ location: s.location }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : s.slug
              ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
            <a href={SCHOOL_PHONE_TEL} aria-label="Call Lakes Area Aviation" className="pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 border border-background/50 px-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-background backdrop-blur-sm sm:hidden"><Phone className="size-4" /> Call</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
