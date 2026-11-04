import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { srcSetFor } from "@/lib/responsive-image";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyAltitude, journeyStop, glideAt, glideDuration, newWheelState, wheelDecision, snapTarget, type SnapZone, JOURNEY_STAGE_SVH, pinnedStepDown, stageStopFraction, stackProgress, stackOffset, touchJourneyFraction, isModeSwitchPoint, resolveMode, STOP_TOL, type JourneyMode, type PageSegment } from "../lib/journey-pacing";
import { airportTraffic, SCHOOL_PHONE_TEL } from "../lib/site-data";
import { patternFor, pickRunway, type PatternField } from "../lib/traffic-pattern";
import { useMetar } from "../lib/use-metar";
import { profileAirport, trafficConditions, NO_CONDITIONS, type Metar } from "../lib/wx-conditions";
import { WX_FIELDS } from "../lib/wx-stations";
import { MetarLine, InstrumentConditions } from "./live-wx";
import { useStageZoom } from "../lib/stage-zoom";
import { TrafficPattern } from "./traffic-pattern";
import { AirportScene } from './airport-scene';
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
const AERIAL_PHONE_VIEW = "265 -300 970 2100";

type Stage = { code: string; label: string; time: string; title: string; text: string; img: string; alt: string; cta: string; slug?: string; location?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number; video?: string; position?: string; traffic?: PatternField; perspective?: boolean; liveWx?: boolean; phoneImg?: string; phoneView?: string; drift?: boolean };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", text: "Left seat, instructor beside you.", img: clouds, phoneImg: cloudsPhone, alt: "Sunrise above a sea of clouds", cta: "Book an intro flight", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", text: "One focused block.", img: runway, phoneImg: runwayPhone, phoneView: "0 -700 1376 1468", alt: "Oblique view of Little Falls (KLXL): runway 13/31 with the full-length runway 18/36 crossing near the runway 13 end", cta: "Private pilot details", slug: "private-pilot", perspective: true, w: 1376, h: 768 },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Train in the real cockpit.", text: "Fly by reference to instruments.", img: instrument, phoneImg: instrumentPhone, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", liveWx: true, position: "center", zoom: 0.2, zoomIn: 0.03, drift: true },
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
  window.dispatchEvent(new CustomEvent("journey-target", { detail: top }));
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
  releasePaging();
  wantedMode = "fade"; setMode("fade");
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    root.classList.remove("journey-free");
  }));
}


// ---- Downward: one gesture = one stop. Upward: native scrolling through stacked pages ----
// Only gestures STARTED in a fully pinned viewport page between that journey's
// own stages. Entry, last-stage exit and all upward movement stay native, except a
// short proximity snap after native momentum ends at a section edge.
const PAGE_SWIPE_PX = 10;
const ENTRY_TOL = 24;
const SCROLL_IDLE_MS = 120;
type JourneyEntry = { n: number; vh: () => number; render: () => void };
const journeys = new Map<HTMLElement, JourneyEntry>();
let paging = false;
/** Active paged glide: from/to scrollY and eased progress p (0→1). Journeys crossfade from p, not from scroll bands. */
let glide: { from: number; to: number; p: number } | null = null;
// Sine ease of glide TIME: ≥ 500 ms of visible blend, with 0.9→0.1 taking ~60% of the glide.
// Half-linear/half-sine ease over the first 85% of the glide: completes before the last pixels of scroll.
const blendEase = (t: number) => { const x = Math.max(0, Math.min(1, t / 0.85)); return 0.5 * x + 0.25 * (1 - Math.cos(Math.PI * x)); };
const wheel = newWheelState();
let tweenFrame = 0;
let glideTimeout = 0;
let controllerRefs = 0;
let removeController: (() => void) | null = null;

let mode: JourneyMode = "fade";
let wantedMode: JourneyMode = "fade";
const modeListeners = new Set<() => void>();
export const journeyMode = () => mode;

// Stop positions are document offsets (independent of scroll), cached and recomputed only on resize.
type Layout = { stops: number[]; zones: { from: number; to: number }[]; stages: number[][]; snap: SnapZone[] };
let layoutCache: Layout | null = null;
export function invalidateJourneyLayout() { layoutCache = null; }
function journeyLayout(): Layout {
  if (layoutCache) return layoutCache;
  const list = [...journeys].sort((a, b) => a[0].offsetTop - b[0].offsetTop);
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const stops: number[] = [], zones: Layout["zones"] = [], stages: number[][] = [], snap: SnapZone[] = [];
  list.forEach(([el, { n, vh }]) => {
    const base = window.scrollY + el.getBoundingClientRect().top;
    const h = vh();
    const total = Math.max(1, el.offsetHeight - h);
    const own: number[] = [];
    const phone = window.matchMedia(PHONE_MQ).matches;
    for (let i = 0; i < n; i += 1) own.push(Math.round(base + (phone ? i * h : total * stageStopFraction(i, n))));
    stops.push(...own);
    stages.push(own);
    zones.push({ from: base, to: Math.min(maxY, base + total) });
    snap.push({ first: own[0] ?? base, last: own[own.length - 1] ?? base, end: Math.min(maxY, Math.round(base + el.offsetHeight)) });
  });
  stops.sort((a, b) => a - b);
  layoutCache = { stops: stops.filter((s, i) => i === 0 || s - (stops[i - 1] ?? s) > STOP_TOL), zones, stages, snap };
  return layoutCache;
}
const pinnedStages = (L: Layout, y: number) => {
  // A few px short of fully pinned (native momentum landing) still counts as the first stage.
  const i = L.zones.findIndex((z) => y >= z.from - ENTRY_TOL && y <= z.to);
  return i < 0 ? null : L.stages[i] ?? null;
};
const downTarget = (y: number) => {
  const own = pinnedStages(journeyLayout(), y);
  if (!own) return null;
  return pinnedStepDown(own, Math.max(y, own[0] ?? y), own[0] ?? y, own[own.length - 1] ?? y);
};
const atSwitchPoint = (L: Layout, y: number) => L.stages.every((own) => isModeSwitchPoint(own, y));
function setMode(next: JourneyMode) { if (mode === next) return; mode = next; modeListeners.forEach((f) => f()); }
function requestMode(next: JourneyMode, L: Layout = journeyLayout()) {
  wantedMode = next;
  setMode(resolveMode(mode, wantedMode, atSwitchPoint(L, window.scrollY)));
}
// Every journey re-renders synchronously from the glide's scroll position in the same frame.
const renderAll = () => journeys.forEach((j) => j.render());

function releasePaging() {
  cancelAnimationFrame(tweenFrame);
  window.clearTimeout(glideTimeout);
  glide = null;
  if (paging) wheel.landedAt = performance.now();
  paging = false;
  wheel.gliding = false;
}

// One eased glide from the REAL current scrollY: strictly monotonic, lands exactly on target.
function runPath(path: PageSegment[], touch = false) {
  releasePaging();
  const end = path[path.length - 1];
  if (!end || Math.abs(end.y - window.scrollY) <= STOP_TOL) return;
  paging = true; wheel.gliding = true;
  const from = window.scrollY, to = end.y;
  const dur = glideDuration(to - from, window.innerHeight, touch);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    // A busy main thread can delay frames past the hard timeout; never leave the page short of its stop.
    if (Math.abs(window.scrollY - to) > 0.5) window.scrollTo({ top: to, behavior: "instant" });
    glide = null;
    renderAll();
    releasePaging();
    setMode(resolveMode(mode, wantedMode, atSwitchPoint(journeyLayout(), window.scrollY)));
  };
  glideTimeout = window.setTimeout(finish, dur + 150);
  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = now - start;
    const y = glideAt(from, to, elapsed, dur);
    window.scrollTo({ top: y, behavior: "instant" });
    // Within a pixel of the stop the blend is complete, so nothing moves after the landing frame.
    glide = { from, to, p: Math.abs(to - y) <= 1 ? 1 : blendEase(elapsed / dur) };
    renderAll();
    if (elapsed < dur) tweenFrame = requestAnimationFrame(tick); else finish();
  };
  tweenFrame = requestAnimationFrame(tick);
}

export function goToJourneyPage(y: number, instant = false) {
  window.dispatchEvent(new CustomEvent("journey-target", { detail: y }));
  if (instant) { releasePaging(); window.scrollTo({ top: y, behavior: "instant" }); requestMode(wantedMode); return; }
  runPath([{ y, instant: false }]);
}

function installController() {
  controllerRefs += 1;
  if (import.meta.env.DEV) (window as unknown as { __journeyStops?: () => number[] }).__journeyStops = () => { invalidateJourneyLayout(); return journeyLayout().stops; };
  if (removeController) return;
  const root = document.documentElement;
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zoomedIn = () => root.classList.contains("journey-zoomed");
  const free = () => root.classList.contains("journey-free");
  // A target must be a later stage in the SAME fully pinned journey.
  const goDown = (touch = false) => {
    const target = downTarget(window.scrollY);
    if (target === null) return false;
    wantedMode = "fade";
    setMode("fade");
    runPath([{ y: target, instant: false }], touch);
    syncMoveBlocker();
    return true;
  };
  const goingUp = () => { if (!paging) requestMode("stack"); };

  const onWheel = (e: WheelEvent) => {
    if ((e.target as Element | null)?.closest?.("[data-model-gesture]")) return;
    if (reduce() || e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || free() || zoomedIn()) return;
    const d = wheelDecision(wheel, performance.now(), e.deltaY, e.deltaY > 0 && downTarget(window.scrollY) !== null);
    if (d === "drop") { e.preventDefault(); return; }
    if (d === "page") { if (goDown()) e.preventDefault(); return; }
    if (e.deltaY < 0) goingUp();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || reduce() || free() || zoomedIn()) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (e.key === " " && /^(BUTTON|A)$/.test(t.tagName)))) return;
    const down = e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey);
    const up = e.key === "PageUp" || e.key === "ArrowUp" || e.key === "Home" || (e.key === " " && e.shiftKey);
    if (up) { goingUp(); return; }
    if (!down) return;
    if (paging) { e.preventDefault(); return; }
    if (goDown()) e.preventDefault();
  };

  let g: { x: number; y: number; decided: boolean; fired: boolean; eligible: boolean } | null = null;
  let touching = false;
  let rejected = false;
  // Any second finger makes the whole gesture a pinch: it never pages.
  let multi = false;
  const cancelForMulti = () => { releasePaging(); multi = true; g = null; rejected = true; };
  // touchend can be dropped when the main thread is busy; a finger with no touch
  // events for 150ms is treated as lifted.
  let lastTouchAt = 0;
  const fingerDown = () => touching && performance.now() - lastTouchAt < 150;
  const onTouchStart = (e: TouchEvent) => {
    if ((e.target as Element | null)?.closest?.("[data-model-gesture]")) { g = null; rejected = true; return; }
    if (e.touches.length > 1 || multi) { lastTouchAt = performance.now(); touching = true; cancelForMulti(); return; }
    touching = true; rejected = false; lastTouchAt = performance.now();
    seqStart = window.scrollY;
    const t = e.touches[0];
    g = e.touches.length === 1 && t && !reduce() ? { x: t.clientX, y: t.clientY, decided: false, fired: false, eligible: downTarget(window.scrollY) !== null } : null;
    syncMoveBlocker();
  };
  // Passive tracker: runs on every touchmove without ever blocking native scroll.
  const onTouchMove = (e: TouchEvent) => {
    if ((e.target as Element | null)?.closest?.("[data-model-gesture]")) { g = null; rejected = true; return; }
    lastTouchAt = performance.now();
    if (e.touches.length > 1 || multi) { cancelForMulti(); return; }
    if (zoomedIn()) { g = null; rejected = true; return; }
    const t = e.touches[0];
    // A finger that went down before the handler attached (first load) is adopted here.
    if (!g && !rejected && t && e.touches.length === 1 && !reduce()) { touching = true; g = { x: t.clientX, y: t.clientY, decided: false, fired: false, eligible: false }; return; }
    if (!g || !t || e.touches.length !== 1) { g = null; rejected = true; return; }
    const dx = g.x - t.clientX, dy = g.y - t.clientY;
    if (g.fired || paging) return;
    if (!g.decided) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // taps with jitter stay taps
      g.decided = true;
      if (Math.abs(dx) > Math.abs(dy) || free()) { g = null; rejected = true; return; }
      // Upward drags are plain 1:1 native scrolling through stacked pages.
      if (dy < 0) { goingUp(); g = null; rejected = true; return; }
    }
    if (!g.eligible) g.eligible = downTarget(window.scrollY) !== null;
  };
  // Non-passive blocker: attached ONLY while a downward page can actually start
  // (fully pinned journey with a later stage, or an active glide). Everywhere
  // else touchmove stays passive, so native scrolling never waits on this file.
  const onTouchMoveBlock = (e: TouchEvent) => {
    // Decide direction in capture, before the browser can commit this move to
    // native scrolling. The passive tracker remains available outside journeys.
    onTouchMove(e);
    if (!e.cancelable) return;
    // Everything during a glide is swallowed, so native scroll never fights it.
    if (paging || g?.fired) { e.preventDefault(); return; }
    if (!g || !g.decided || !g.eligible) return;
    // A pinned downward drag never starts native scrolling: the glide owns the whole move.
    e.preventDefault();
    const t = e.touches[0];
    if (t && g.y - t.clientY >= PAGE_SWIPE_PX && goDown(true)) g.fired = true;
  };
  let moveBlocker = false;
  const syncMoveBlocker = () => {
    const want = paging || (!reduce() && !free() && !zoomedIn() && downTarget(window.scrollY) !== null);
    if (want === moveBlocker) return;
    moveBlocker = want;
    if (want) window.addEventListener("touchmove", onTouchMoveBlock, { passive: false, capture: true });
    else window.removeEventListener("touchmove", onTouchMoveBlock, true);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) { multi = false; touching = false; g = null; scheduleSettle(); syncMoveBlocker(); }
  };

  // Proximity snap once native scrolling has come to rest (scrollend or 120ms without scroll).
  // Start of the current native scroll run: reset only after 300ms without scrolling, so a
  // burst of wheel notches (each with its own scrollend) counts as one move.
  let lastDir = 1, lastScrollY = window.scrollY, seqStart = window.scrollY, idleTimer = 0, moving = false, lastMoveAt = 0;
  const settle = () => {
    window.clearTimeout(idleTimer);
    if (!moving || paging || fingerDown()) return;
    // Wheel notches still arriving: wait for the gesture to finish.
    if (performance.now() - wheel.lastAt < SCROLL_IDLE_MS) { scheduleSettle(); return; }
    moving = false;
    const y = window.scrollY;
    if (reduce() || free() || zoomedIn() || lastDir < 0) return;
    const target = snapTarget(journeyLayout().snap, y, seqStart, window.innerHeight);
    if (target === null) return;
    // The rest of the wheel gesture that produced this momentum must not page again.
    wheel.used = true;
    seqStart = target;
    runPath([{ y: target, instant: false }]);
  };
  const scheduleSettle = () => { window.clearTimeout(idleTimer); idleTimer = window.setTimeout(settle, SCROLL_IDLE_MS); };
  const onScroll = () => {
    const y = window.scrollY, now = performance.now();
    if (Math.abs(y - lastScrollY) > 0.5) lastDir = y > lastScrollY ? 1 : -1;
    if (!paging && !touching && now - lastMoveAt > 300) seqStart = lastScrollY;
    lastMoveAt = now;
    lastScrollY = y;
    if (paging) { seqStart = y; moving = false; return; }
    moving = true;
    scheduleSettle();
    syncMoveBlocker();
    const L = journeyLayout();
    if (lastDir < 0) { wantedMode = "stack"; setMode(resolveMode(mode, wantedMode, atSwitchPoint(L, y))); return; }
    setMode(resolveMode(mode, wantedMode, atSwitchPoint(L, y)));
  };
  const onScrollEnd = () => scheduleSettle();
  const onResize = () => invalidateJourneyLayout();
  const ro = new ResizeObserver(onResize);
  ro.observe(document.body);
  journeys.forEach((_, el) => ro.observe(el));
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  syncMoveBlocker();
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", onScrollEnd);
  window.addEventListener("resize", onResize);
  removeController = () => {
    ro.disconnect();
    window.clearTimeout(idleTimer);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchmove", onTouchMoveBlock, true);
    moveBlocker = false;
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", onScrollEnd);
    window.removeEventListener("resize", onResize);
    releasePaging();
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
  const stackCopyRef = useRef<HTMLDivElement>(null);
  const stackCopyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hudRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mx = 0, my = 0, frame = 0, last = -1;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const phone = window.matchMedia(PHONE_MQ).matches;
    const n = stages.length;
    // Geometry is cached (document offset of the section, pinned length, viewport height) and
    // recomputed only on resize, so a frame never reads layout.
    let geo: { base: number; total: number; vh: number } | null = null;
    const measure = () => {
      const el = sectionRef.current;
      if (!el) return null;
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      geo = { base: window.scrollY + el.getBoundingClientRect().top, total: Math.max(1, el.offsetHeight - vh), vh };
      return geo;
    };
    const render = () => {
      const g0 = geo ?? measure();
      if (!g0) return;
      const viewportHeight = g0.vh, total = g0.total;
      const rect = { top: g0.base - window.scrollY };
      const fractionAt = (y: number) => phone ? touchJourneyFraction((y - g0.base) / viewportHeight, n) : (y - g0.base) / total;
      const scrolled = journeyFrame(fractionAt(window.scrollY), n);
      // Paged glide inside this journey: blend over the glide's whole eased progress. Endpoints are
      // stops (transition 0), so this agrees exactly with the scroll mapping when the glide lands.
      const inJourney = (y: number) => y >= g0.base - 1 && y <= g0.base + total + 1;
      const pg = glide && inJourney(glide.from) && inJourney(glide.to) ? (() => {
        const a = journeyFrame(fractionAt(glide.from), n), b = journeyFrame(fractionAt(glide.to), n);
        const sa = a.stage + a.transition, sb = b.stage + b.transition;
        return { shown: sa + (sb - sa) * glide.p, p: glide.p, alt: journeyAltitude(a, n) + (journeyAltitude(b, n) - journeyAltitude(a, n)) * glide.p, progress: a.progress + (b.progress - a.progress) * glide.p };
      })() : null;
      const showActive = (idx: number) => {
        if (hudRef.current) hudRef.current.textContent = Math.round(pg ? pg.alt : journeyAltitude(scrolled, n)).toLocaleString("en-US");
        if (barRef.current) barRef.current.style.transform = `scaleY(${pg ? pg.progress : scrolled.progress})`;
        if (idx === last) return;
        last = idx;
        setActive(idx);
        videoRefs.current.forEach((video, videoIndex) => {
          if (!video) return;
          if (videoIndex === idx && !reduce) void video.play().catch(() => undefined);
          else video.pause();
        });
      };
      // Stack mode (scrolling up, and always in reduced motion): each stage is its own
      // full-height page; stage k sits at translateY((k - progress) * 100%), moving 1:1 with scroll.
      if (reduce || journeyMode() === "stack") {
        const p = stackProgress(fractionAt(window.scrollY), n);
        layerRefs.current.forEach((layer, i) => {
          if (!layer) return;
          const off = stackOffset(i, p);
          layer.style.transform = `translate3d(0, ${(off * viewportHeight).toFixed(1)}px, 0)`;
          layer.style.opacity = Math.abs(off) < 1 ? "1" : "0";
          layer.style.visibility = Math.abs(off) < 1 ? "visible" : "hidden";
          layer.style.pointerEvents = Math.abs(off) < 0.5 ? "auto" : "none";
          layer.dataset["stack"] = "";
        });
        if (copyRef.current) { copyRef.current.style.opacity = "0"; copyRef.current.style.transform = "none"; }
        if (stackCopyRef.current) stackCopyRef.current.style.visibility = "visible";
        stackCopyRefs.current.forEach((c, i) => { if (c) c.style.transform = `translate3d(0, ${(stackOffset(i, p) * viewportHeight).toFixed(1)}px, 0)`; });
        showActive(Math.max(0, Math.min(n - 1, Math.round(p))));
        return;
      }
      if (stackCopyRef.current) stackCopyRef.current.style.visibility = "hidden";
      // Opacity/transform derive directly from the scroll position (no smoothing), so a glide's
      // crossfade is complete on the frame it lands.
      const shown = pg ? pg.shown : scrolled.stage + scrolled.transition;
      const base = Math.min(n - 1, Math.floor(shown + 1e-6));
      const t = Math.max(0, Math.min(1, shown - base));
      // During a glide the outgoing copy fades over the first 40%, the incoming over the last 50%.
      const copyOpacity = pg ? (t < 0.4 ? 1 - t / 0.4 : t > 0.5 ? (t - 0.5) / 0.5 : 0) : Math.abs(1 - 2 * t);
      const state = { stage: base, next: Math.min(n - 1, base + 1), transition: t, active: t < 0.5 ? base : Math.min(n - 1, base + 1), copyOpacity, progress: scrolled.progress };
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const st = stages[i];
        const leaving = i === state.stage ? state.transition : 0;
        const coming = i === state.next && i !== state.stage ? 1 - state.transition : 0;
        // Layers are viewport-sized; pointer parallax is covered by a GPU scale, not a larger raster.
        const cover = reduce || !fine ? 0 : 0.04;
        const scale = reduce ? 1 : 1 + cover + leaving * (st?.zoom ?? 0.55) + coming * (st?.zoomIn ?? 0.06);
        const opacity = i === state.stage ? 1 - state.transition : i === state.next && state.transition > 0 ? 1 : 0;
        const depth = reduce || !fine ? 0 : 10 + i * 3;
        layer.style.transform = `translate3d(${(mx * -depth).toFixed(2)}px, ${(my * -depth).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        layer.style.opacity = opacity.toFixed(3);
        // Only the outgoing/incoming pair is rendered; others leave the compositor entirely.
        layer.style.visibility = opacity > 0 || i === state.stage ? "visible" : "hidden";
        layer.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
        delete layer.dataset["stack"];
      });
      if (copyRef.current) {
        copyRef.current.style.opacity = reduce ? "1" : state.copyOpacity.toFixed(3);
        copyRef.current.style.transform = reduce ? "none" : `translate3d(0, ${((1 - state.copyOpacity) * 8).toFixed(2)}px, 0)`;
      }
      showActive(state.active);
    };
    const renderScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; renderScroll(); };
    const el = sectionRef.current;
    const vh = () => viewportRef.current?.offsetHeight ?? window.innerHeight;
    if (el) journeys.set(el, { n, vh, render });
    invalidateJourneyLayout();
    installController();
    const remeasure = () => { measure(); invalidateJourneyLayout(); renderScroll(); };
    const ro = new ResizeObserver(remeasure);
    if (el) ro.observe(el);
    ro.observe(document.body);
    modeListeners.add(renderScroll);
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number; animate?: boolean }>).detail;
      if (d?.id !== id || !el) return;
      const base = window.scrollY + el.getBoundingClientRect().top, total = Math.max(1, el.offsetHeight - vh());
      const y = Math.round(window.matchMedia(PHONE_MQ).matches ? base + Math.min(n - 1, d.index) * vh() : d.index >= n - 1 ? base + total : base + total * journeyStop(d.index, n));
      goToJourneyPage(y, !d.animate);
    };
    render();
    window.addEventListener("scroll", renderScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("journey:jump", onJump);
    if (!reduce && fine) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      if (el) journeys.delete(el);
      invalidateJourneyLayout();
      modeListeners.delete(renderScroll);
      uninstallController();
      window.removeEventListener("journey:jump", onJump);
      window.removeEventListener("scroll", renderScroll);
      window.removeEventListener("resize", remeasure);
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
  const { zoomed, reset } = useStageZoom({ viewportRef, target: () => layerRefs.current[active]?.querySelector<HTMLElement>(".journey-zoom") ?? null, resetKey: active });
  const metar = useMetar();
  // Active runway per airport stage from live wind; calm-wind runway (and no readout) without weather.
  const ops = useMemo(() => stages.map((st) => {
    if (!st.traffic) return null;
    const obs = metar?.[st.traffic.ident] ?? metar?.[st.traffic.wxStation] ?? null;
    const rwy = pickRunway(st.traffic, obs ? { dir: obs.dir, kt: obs.kt } : null);
    const f = WX_FIELDS[st.traffic.ident as keyof typeof WX_FIELDS];
    const conditions = trafficConditions(obs, { elevation: st.traffic.elevation, ident: st.traffic.ident, ...(f ? { lat: f.lat, lon: f.lon } : {}) }, rwy.runway);
    return { obs, rwy, conditions, pattern: profileAirport(patternFor(st.traffic, rwy), conditions.mode) };
  }), [stages, metar]);
  // Private Pilot oblique view and Instrument stage: Little Falls conditions.
  const klxl = metar?.["KLXL"] ?? null;
  const klxlConditions = useMemo(() => trafficConditions(klxl, { elevation: 1123, ident: "KLXL", lat: WX_FIELDS.KLXL.lat, lon: WX_FIELDS.KLXL.lon }, "13"), [klxl]);
  const [wxOpen, setWxOpen] = useState(false);
  const s = stages[active] ?? stages[0];
  if (!s) return null;
  return (
    <section ref={sectionRef} data-journey-section="" id={id} aria-label={label} className="journey-section relative bg-ink text-background" style={{ height: `${stages.length * JOURNEY_STAGE_SVH + 100}svh`, "--journey-count": stages.length } as React.CSSProperties}>
      {stages.map((st, i) => (
        <div key={`stop-${st.code}`} aria-hidden className="journey-stop journey-stop-page pointer-events-none absolute left-0 h-px w-px" style={{ top: `${journeyStop(i, stages.length) * stages.length * JOURNEY_STAGE_SVH}svh`, "--phone-stop": `${i * 100}svh` } as React.CSSProperties} />
      ))}
      <div ref={viewportRef} data-zoomed={zoomed ? "" : undefined} className="journey-viewport sticky top-0 h-svh overflow-hidden">
        {stages.map((st, i) => (
          <div key={st.code} ref={(el) => { layerRefs.current[i] = el; }} className="journey-layer absolute inset-0 bg-ink backface-hidden" data-active={i === active ? "" : undefined} style={{ zIndex: stages.length - i }}>
            <div className="journey-zoom absolute inset-0 origin-top-left">
            {st.traffic && st.phoneImg ? <AirportScene airport={ops[i]?.pattern ?? st.traffic} active={i===active} photo={st.phoneImg} original={st.img} wind={ops[i]?.obs ?? null} runwayHeading={ops[i]?.rwy.trueHdg ?? Number(st.traffic.runway)*10} conditions={ops[i]?.conditions ?? NO_CONDITIONS} /> : st.video ? (
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
                {st.phoneImg && <source media={PHONE_MQ} srcSet={srcSetFor(st.phoneImg) ?? st.phoneImg} sizes="100vw" />}
                <img src={st.img} srcSet={srcSetFor(st.img)} sizes="100vw" alt={st.alt} width={st.w ?? 1920} height={st.h ?? 1088} loading="lazy" decoding="async" className={`h-full w-full bg-ink object-cover${st.drift ? " journey-drift" : ""}`} style={{ objectPosition: st.position ?? "center" }} />
              </picture>
            )}
            {SHOW_TRAFFIC && st.traffic && !st.phoneImg && <TrafficPattern airport={ops[i]?.pattern ?? st.traffic} wind={ops[i]?.obs ?? null} runwayHeading={ops[i]?.rwy.trueHdg ?? Number(st.traffic.runway)*10} conditions={ops[i]?.conditions ?? NO_CONDITIONS} active={i === active} />}
            {st.perspective && <TrafficPerspective wind={klxl} conditions={klxlConditions} active={i === active} {...(isPhone && st.phoneView ? { viewBox: st.phoneView } : {})} />}
            </div>
          </div>
        ))}
        <div className="journey-shade pointer-events-none absolute inset-0 z-10 transition-opacity duration-300" />
        <div className="journey-grain pointer-events-none absolute inset-0 z-10" />
        <div ref={fadeTopRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-ink" style={{ opacity: 0 }} />
        <div ref={fadeBottomRef} aria-hidden className={`pointer-events-none absolute inset-0 z-40 ${fadeBottom === "background" ? "bg-background" : "bg-ink"}`} style={{ opacity: 0 }} />

        {/* HUD */}
        <div className="journey-hud absolute left-5 sm:left-[max(var(--gutter),calc((100%-1720px)/2))] top-24 z-20 font-mono text-xs uppercase tracking-[0.2em] text-background/70 lg:text-[13px]">
          {mode === "alt" ? <p>Alt <span ref={hudRef} className="tabular-nums text-background">0</span> ft</p> : <><p className="text-background">{s.hud}</p>{s.traffic && <div className="wx-hud-slot">{(() => { const o = ops[active]; if (!o?.obs) return null; const w = o.obs; return (<>
            <button type="button" onClick={() => setWxOpen((v) => !v)} aria-expanded={wxOpen} className="pointer-events-auto flex min-h-11 items-center gap-1.5 text-left uppercase tracking-[inherit] text-background sm:pointer-events-none sm:cursor-default" data-wind aria-label={`Wind at ${w.station}: ${w.dir === null ? (w.kt ? "variable" : "calm") : `${w.dir} degrees`} ${w.kt} knots${w.gust ? ` gusting ${w.gust}` : ""}. Active runway ${o.rwy.runway}. ${wxOpen ? "Hide" : "Show"} full METAR`}>
              {w.dir !== null && w.kt > 0 && <svg viewBox="0 0 12 12" className="size-3 text-[color:var(--radar)]" style={{ transform: `rotate(${w.dir + 180}deg)` }} aria-hidden><path d="M6 1v10M2.5 4.5 6 1l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>}
              <span>Wind {w.kt === 0 ? "calm" : `${w.dir === null ? "VRB" : String(w.dir).padStart(3, "0") + "°"} ${w.kt}${w.gust ? `G${w.gust}` : ""}KT`}</span>
              <span className="text-background/60">{w.station} · RWY {o.rwy.runway}</span>
              <span aria-hidden className="text-background/60 sm:hidden">{wxOpen ? "▴" : "▾"}</span>
            </button>
            <p className={`mt-1 max-w-[min(34rem,calc(100vw-6rem))] ${wxOpen ? "" : "max-sm:hidden"}`}><MetarLine obs={w} /></p>
            {o.conditions.mode === "ifr" && <p className="mt-1 font-bold text-background" data-pattern-closed>{o.obs.cat ?? "IFR"} — pattern closed</p>}
          </>); })()}</div>}{s.traffic && <p className="mt-1 hidden sm:block">RWY {ops[active]?.rwy.runway ?? s.traffic.runway} · {ops[active]?.rwy.side ?? s.traffic.side} traffic · TPA {(s.traffic.elevation + (ops[active]?.pattern.tpaAgl ?? s.traffic.tpaAgl)).toLocaleString("en-US")} MSL</p>}</>}
          <p className="mt-1 hidden sm:block">Stage {s.code} / 0{stages.length}</p>
        </div>

        {/* Stage rail */}
        <nav aria-label={`${label} stages`} className="absolute right-4 sm:right-[max(var(--gutter),calc((100%-1720px)/2))] top-1/2 z-30 flex -translate-y-1/2 items-stretch gap-4">
          <div className="journey-stage-rail relative w-px overflow-hidden bg-background/20">
            <div ref={barRef} className="absolute inset-0 origin-top bg-primary" style={{ transform: "scaleY(0)" }} />
            <span aria-hidden="true" className="landing-scroll-stroke absolute inset-x-0 top-0 h-8 bg-background" />
          </div>
          <ol className="flex flex-col justify-between gap-1 sm:gap-3">
            {stages.map((st, i) => (
              <li key={st.code}>
                <Button variant="ghost" type="button" aria-label={st.label} aria-current={i === active ? "step" : undefined} onClick={() => jump(i)} className={`group h-11 min-w-11 justify-start gap-3 rounded-none px-2 text-left text-xs lg:text-[13px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-transparent ${i === active ? "outlined-accent-label" : "text-background/55 hover:text-background/80"}`}>
                  <span className={`size-2 rounded-full border border-current transition-all ${i === active ? "scale-150 bg-primary border-primary" : ""}`} />
                  <span className="hidden sm:inline">{st.label}</span>
                </Button>
              </li>
            ))}
          </ol>
        </nav>

        {zoomed && (
          <button type="button" onClick={reset} aria-label="Reset zoom" className="absolute right-4 top-24 z-30 inline-flex min-h-11 min-w-11 items-center gap-1.5 border border-background/40 bg-ink/70 px-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-background backdrop-blur-sm">✕ Reset</button>
        )}
        {/* Copy */}
        <div className="site-container journey-copy-wrap pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-lg:!pr-14 sm:pb-24 md:pb-12 lg:pb-16">
          <div ref={copyRef} className="journey-copy max-w-2xl">
            <StageCopy s={s} wx={klxl} wxLoading={metar === undefined} />
          </div>
        </div>
        {/* Stack mode (scrolling up): every stage's copy rides on its own page. */}
        <div ref={stackCopyRef} aria-hidden="true" className="journey-copy-stack pointer-events-none absolute inset-0 z-20 overflow-hidden" style={{ visibility: "hidden" }}>
          {stages.map((st, i) => (
            <div key={`copy-${st.code}`} ref={(el) => { stackCopyRefs.current[i] = el; }} inert className="absolute inset-0">
              <div className="site-container journey-copy-wrap pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-lg:!pr-14 sm:pb-24 md:pb-12 lg:pb-16">
                <div className="journey-copy max-w-2xl"><StageCopy s={st} wx={klxl} wxLoading={metar === undefined} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StageCopy({ s, wx, wxLoading }: { s: Stage; wx: Metar | null; wxLoading: boolean }) {
  return (
    <>
      <p className="stage-label max-sm:tracking-[0.18em]"><span className="max-sm:hidden">{s.code} · </span>{s.label}<span className="sm:hidden"> · {s.time}</span></p>
      <p className="mt-2 hidden font-display text-5xl leading-none sm:block">{s.time}</p>
      <h2 className="mt-1.5 font-display text-lg leading-[1.1] min-[380px]:text-xl sm:mt-2 sm:text-2xl">{s.title}</h2>
      <p className="mt-1 max-w-lg text-pretty text-sm leading-snug text-background/80 sm:mt-2 sm:text-base">{s.text}</p>
      {s.liveWx && <InstrumentConditions obs={wx} loading={wxLoading} />}
      <div className="flex flex-nowrap items-end gap-2">
      {s.location
        ? <Link to="/contact" search={{ location: s.location }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
        : s.slug
        ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
        : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
      <a href={SCHOOL_PHONE_TEL} aria-label="Call Lakes Area Aviation" className="pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border border-background/50 px-3 text-xs font-bold uppercase tracking-[0.06em] text-background backdrop-blur-sm sm:hidden"><Phone className="size-4" /> Call</a>
      </div>
    </>
  );
}
