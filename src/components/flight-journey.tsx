import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { srcSetFor } from "@/lib/responsive-image";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyAltitude, settleTarget, stageLanding, stageLengthFrom, JOURNEY_TAIL, type JourneyGeometry } from "../lib/journey-scroll";
import { airportTraffic, SCHOOL_PHONE_TEL } from "../lib/site-data";
import { patternFor, pickRunway, type PatternField } from "../lib/traffic-pattern";
import { useMetar } from "../lib/use-metar";
import { useLiveTraffic } from "../lib/use-live-traffic";
import { compass, type LiveAircraft } from "../lib/live-traffic";
import { profileAirport, trafficConditions, NO_CONDITIONS, type Metar } from "../lib/wx-conditions";
import { WX_FIELDS } from "../lib/wx-stations";
import { MetarLine, InstrumentConditions } from "./live-wx";
import { useStageZoom } from "../lib/stage-zoom";
import { useMobileJourneyMode } from "../lib/use-site-settings";
import { storyStep } from "../lib/story-nav";
import { TrafficPattern } from "./traffic-pattern";
import { AirportScene } from './airport-scene';
import { TrafficPerspective } from "./traffic-perspective";
import airlineVideo from "../assets/journey/airline-approach-1080.mp4.asset.json";
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
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Train in the real cockpit.", text: "Fly by reference to instruments.", img: instrument, phoneImg: instrumentPhone, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", position: "center", zoom: 0.2, zoomIn: 0.03, drift: true },
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

/** Scroll comes to rest when no scroll event has arrived for this long (scrollend is used too where supported). */
const SETTLE_IDLE_MS = 140;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smooth scroll to a document position; instant under reduced motion or when asked. Never blocks input. */
export function glideTo(top: number, instant = false) {
  window.dispatchEvent(new CustomEvent("journey-target", { detail: top }));
  window.scrollTo({ top, behavior: reducedMotion() || instant ? "instant" : "smooth" });
}

/** Instant jump to the very top (logo / Home tapped while already on "/"). */
export function jumpToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export function jumpToJourney(id: string, index: number, animate = false) {
  window.dispatchEvent(new CustomEvent("journey:jump", { detail: { id, index, animate } }));
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
  const isPhone = useIsPhone();
  const journeyMode = useMobileJourneyMode();
  // Story mode (owner admin switch): phones only; desktop always keeps the scroll version.
  const story = journeyMode === "story" && isPhone;
  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => {
    const el = sectionRef.current, viewport = viewportRef.current;
    if (!el || !viewport) return;
    if (story) return;
    const reduce = reducedMotion();
    const fine = window.matchMedia("(pointer: fine)").matches;
    const n = stages.length;
    let mx = 0, my = 0, frame = 0, last = -1;

    // Geometry (document offset of the section, px per stage, viewport height) is cached and
    // recomputed only on resize, so a frame never reads layout.
    let geo: JourneyGeometry | null = null;
    const measure = (): JourneyGeometry => {
      const vh = viewport.offsetHeight || window.innerHeight;
      geo = { base: window.scrollY + el.getBoundingClientRect().top, stage: stageLengthFrom(el.offsetHeight, vh, n), count: n };
      return geo;
    };

    const showActive = (idx: number) => {
      if (idx === last) return;
      last = idx;
      setActive(idx);
      videoRefs.current.forEach((video, videoIndex) => {
        if (!video) return;
        if (videoIndex === idx && !reduce) void video.play().catch(() => undefined);
        else video.pause();
      });
    };

    // Opacity/transform derive directly from the scroll position (no smoothing, no tween):
    // the picture always sits exactly where the visitor's finger or wheel put it.
    const render = () => {
      const g = geo ?? measure();
      const fr = journeyFrame(g, window.scrollY);
      if (hudRef.current) hudRef.current.textContent = journeyAltitude(fr, n).toLocaleString("en-US");
      if (barRef.current) barRef.current.style.transform = `scaleY(${fr.progress})`;
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const st = stages[i];
        const leaving = i === fr.stage ? fr.transition : 0;
        const coming = i === fr.next && i !== fr.stage ? 1 - fr.transition : 0;
        // Layers are viewport-sized; pointer parallax is covered by a GPU scale, not a larger raster.
        const cover = reduce || !fine ? 0 : 0.04;
        const scale = reduce ? 1 : 1 + cover + leaving * (st?.zoom ?? 0.55) + coming * (st?.zoomIn ?? 0.06);
        const opacity = i === fr.stage ? 1 - fr.transition : i === fr.next && fr.transition > 0 ? 1 : 0;
        const depth = reduce || !fine ? 0 : 10 + i * 3;
        layer.style.transform = `translate3d(${(mx * -depth).toFixed(2)}px, ${(my * -depth).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        layer.style.opacity = opacity.toFixed(3);
        // Only the outgoing/incoming pair is rendered; the others leave the compositor entirely.
        layer.style.visibility = opacity > 0 || i === fr.stage ? "visible" : "hidden";
        layer.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      });
      if (copyRef.current) {
        copyRef.current.style.opacity = reduce ? "1" : fr.copyOpacity.toFixed(3);
        copyRef.current.style.transform = reduce ? "none" : `translate3d(0, ${((1 - fr.copyOpacity) * 8).toFixed(2)}px, 0)`;
      }
      showActive(fr.active);
    };
    const renderScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };

    // Settle: a scroll that comes to rest INSIDE a crossfade finishes it toward the nearer edge
    // (never more than half a crossfade window, never while a finger is on the glass, never while
    // wheel or keyboard input is still arriving). A rest position inside a hold is never touched,
    // so no swipe, notch or key press is ever undone or "eaten".
    const INPUT_QUIET_MS = 200;
    let idle = 0, fingers = 0, settling: number | null = null, lastInputAt = -Infinity;
    const settle = () => {
      window.clearTimeout(idle);
      if (fingers > 0 || document.documentElement.classList.contains("journey-zoomed")) return;
      if (performance.now() - lastInputAt < INPUT_QUIET_MS) { scheduleSettle(); return; }
      const target = settleTarget(geo ?? measure(), window.scrollY);
      if (target === null) { settling = null; return; }
      if (settling === target) return; // already on its way there
      settling = target;
      window.scrollTo({ top: target, behavior: reduce ? "instant" : "smooth" });
    };
    const scheduleSettle = () => { window.clearTimeout(idle); idle = window.setTimeout(settle, SETTLE_IDLE_MS); };
    const onScroll = () => { renderScroll(); scheduleSettle(); };
    // scrollend fires after every wheel notch's own animation, so it only re-arms the idle timer.
    const onScrollEnd = () => scheduleSettle();
    // Any new input cancels a settle in flight (the browser already stops the programmatic scroll).
    const onInput = () => { lastInputAt = performance.now(); settling = null; window.clearTimeout(idle); };
    const onTouchStart = (e: TouchEvent) => { fingers = e.touches.length; onInput(); };
    const onTouchEnd = (e: TouchEvent) => { fingers = e.touches.length; if (fingers === 0) scheduleSettle(); };

    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; renderScroll(); };
    const remeasure = () => { measure(); renderScroll(); };
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    ro.observe(document.body);
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number; animate?: boolean }>).detail;
      if (d?.id !== id) return;
      const y = stageLanding(measure(), d.index);
      settling = null;
      glideTo(y, !d.animate);
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("keydown", onInput, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("journey:jump", onJump);
    if (!reduce && fine) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("journey:jump", onJump);
      window.removeEventListener("pointermove", onMove);
    };
  }, [stages, id, story]);

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

  // ---- Story mode: sideways stages with a box-turn; vertical swipes are handled here (locked screen).
  const paintStory = (pos: number, animate: boolean) => {
    const reduce = reducedMotion();
    layerRefs.current.forEach((layer, i) => {
      if (!layer) return;
      const rel = i - pos;
      const vis = Math.abs(rel) < 1;
      layer.style.transition = animate ? (reduce ? "opacity 240ms ease-out" : "transform 360ms cubic-bezier(0.2,0,0,1), opacity 360ms ease-out") : "none";
      layer.style.visibility = vis || Math.round(pos) === i ? "visible" : "hidden";
      layer.style.pointerEvents = Math.round(pos) === i ? "auto" : "none";
      if (reduce) { layer.style.transform = "none"; layer.style.opacity = String(Math.max(0, 1 - Math.abs(rel))); return; }
      layer.style.opacity = vis ? "1" : "0";
      layer.style.transformOrigin = rel >= 0 ? "left center" : "right center";
      layer.style.transform = `translate3d(${(rel * 100).toFixed(3)}%,0,0) rotateY(${(rel * 90).toFixed(3)}deg)`;
    });
    // Altitude follows the finger between stages, like the scroll version's climb.
    if (hudRef.current) {
      const n = stages.length, p = Math.max(0, Math.min(n - 1, pos)), a = Math.floor(p);
      hudRef.current.textContent = journeyAltitude({ stage: a, next: Math.min(n - 1, a + 1), transition: p - a }, n).toLocaleString("en-US");
    }
  };
  useEffect(() => {
    if (!story) {
      layerRefs.current.forEach((l) => { if (l) { l.style.transition = ""; l.style.transformOrigin = ""; } });
      return;
    }
    paintStory(active, true);
    if (copyRef.current) { copyRef.current.style.opacity = "1"; copyRef.current.style.transform = "none"; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, active]);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!story) return;
    const root = document.documentElement;
    root.classList.add("story-mode"); // hides the page-progress bar; the trail shows progress instead
    const vp = viewportRef.current;
    if (!vp) return () => root.classList.remove("story-mode");
    // Coach mark: fades in after a short idle while this section fills the screen; any touch hides it and restarts the wait.
    // Shown once per section per visit, for 3s at most.
    let inView = false, timer = 0, shown = false, hide = 0;
    const arm = () => { window.clearTimeout(timer); setHint(false); if (inView && !shown) timer = window.setTimeout(() => { shown = true; setHint(true); hide = window.setTimeout(() => setHint(false), 3000); }, 1200); };
    const io = new IntersectionObserver(([en]) => { inView = !!en?.isIntersecting && en.intersectionRatio > 0.85; arm(); }, { threshold: [0.85] });
    io.observe(vp);
    vp.addEventListener("pointerdown", arm);
    return () => { root.classList.remove("story-mode"); io.disconnect(); window.clearTimeout(timer); window.clearTimeout(hide); vp.removeEventListener("pointerdown", arm); };
  }, [story]);
  useEffect(() => {
    if (!story) return;
    const el = sectionRef.current, viewport = viewportRef.current;
    if (!el || !viewport) return;
    const n = stages.length;
    // Story sections are sticky so the next one slides up over them; measure from the in-flow wrapper.
    const box = () => (el.parentElement ?? el).getBoundingClientRect();
    const exitSection = () => glideTo(window.scrollY + box().top + el.offsetHeight);
    const go = (dir: 1 | -1) => {
      const next = storyStep(activeRef.current, n, dir);
      if (next === "exit") { paintStory(activeRef.current, true); exitSection(); return; }
      if (next === activeRef.current) { paintStory(next, true); return; }
      setActive(next);
    };
    let sx = 0, sy = 0, axis: "x" | "y" | null = null, down = false, dx = 0, dy = 0, vx = 0, vy = 0, lx = 0, ly = 0, lt = 0;
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a,button,input,select,textarea,[role=button],[data-interactive],.journey-hud,nav,svg [tabindex]");
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || document.documentElement.classList.contains("journey-zoomed")) return;
      down = true; axis = null; dx = 0; dy = 0; vx = 0; vy = 0; sx = lx = e.clientX; sy = ly = e.clientY; lt = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (document.documentElement.classList.contains("journey-zoomed") || !e.isPrimary) { down = false; return; }
      const now = performance.now(), dt = Math.max(1, now - lt);
      // Smoothed release velocity (px/ms) from the latest movement only, so a drag that reverses follows the last direction.
      vx = vx * 0.4 + ((e.clientX - lx) / dt) * 0.6; vy = vy * 0.4 + ((e.clientY - ly) / dt) * 0.6;
      lx = e.clientX; ly = e.clientY; lt = now;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!axis && Math.hypot(mx, my) > 8) {
        axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        if (axis === "x") try { viewport.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      dy = my;
      if (axis !== "x") return;
      dx = mx;
      const w = viewport.offsetWidth || 1;
      let t = -dx / w;
      const a = activeRef.current;
      if (a === 0 && t < 0) t *= 0.25; // rubber-band at the first stage
      paintStory(a + Math.max(-1, Math.min(1, t)), false);
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      const w = viewport.offsetWidth || 1;
      const stale = performance.now() - lt > 90; // finger held still before lifting = no flick
      if (axis === "x") {
        const v = stale ? 0 : vx;
        // Like Stories: a flick commits in the flick's direction; otherwise past halfway commits, else springs back.
        let dir = 0;
        if (Math.abs(v) > 0.35) dir = v < 0 && dx < 0 ? 1 : v > 0 && dx > 0 ? -1 : 0;
        else if (Math.abs(dx) > w * 0.5) dir = dx < 0 ? 1 : -1;
        if (dir) go(dir as 1 | -1); else paintStory(activeRef.current, true);
        return;
      }
      if (axis === "y") {
        // Screen is locked: a vertical swipe moves exactly one section (or re-aligns this one), never a free fling.
        const v = stale ? 0 : vy;
        if (Math.abs(dy) < 40 && Math.abs(v) < 0.3) return;
        const top = box().top, here = window.scrollY + top;
        if (dy < 0) { if (top > 2) glideTo(here); else exitSection(); }
        else { if (top < -2) glideTo(here); else glideTo(Math.max(0, here - window.innerHeight)); }
        return;
      }
      if (axis === null && !interactive(e.target)) {
        // Tapping while caught between two sections first snaps this one into place.
        const top = box().top;
        if (Math.abs(top) > 2) { glideTo(window.scrollY + top); return; }
        go(e.clientX < w * 0.3 ? -1 : 1);
      }
    };
    const onCancel = () => { if (down) { down = false; paintStory(activeRef.current, true); } };
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number; animate?: boolean }>).detail;
      if (d?.id !== id) return;
      setActive(Math.max(0, Math.min(n - 1, d.index)));
      glideTo(window.scrollY + box().top, !d.animate);
    };
    const noDrag = (e: Event) => e.preventDefault(); // native image drag would steal the pointer mid-swipe
    viewport.addEventListener("dragstart", noDrag);
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove, { passive: true });
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onCancel);
    window.addEventListener("journey:jump", onJump);
    return () => {
      viewport.removeEventListener("dragstart", noDrag);
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("journey:jump", onJump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, stages, id]);

  const { zoomed, reset } = useStageZoom({ viewportRef, target: () => layerRefs.current[active]?.querySelector<HTMLElement>(".journey-zoom") ?? null, resetKey: active });
  const metar = useMetar();
  const liveTraffic = useLiveTraffic();
  // Active runway per airport stage from live wind; calm-wind runway (and no readout) without weather.
  const ops = useMemo(() => stages.map((st) => {
    if (!st.traffic) return null;
    const obs = metar?.[st.traffic.ident] ?? metar?.[st.traffic.wxStation] ?? null;
    const rwy = pickRunway(st.traffic, obs ? { dir: obs.dir, kt: obs.kt } : null);
    const f = WX_FIELDS[st.traffic.ident as keyof typeof WX_FIELDS];
    const live = trafficConditions(obs, { elevation: st.traffic.elevation, ident: st.traffic.ident, ...(f ? { lat: f.lat, lon: f.lon } : {}) }, rwy.runway);
    // Owner: planes always fly the pattern, even in IFR (weather only shapes wind/climb/runway).
    const conditions = { ...live, mode: live.mode === "ifr" ? "mvfr" as const : live.mode, approach: null };
    return { obs, rwy, conditions, pattern: profileAirport(patternFor(st.traffic, rwy), conditions.mode) };
  }), [stages, metar]);
  // Private Pilot oblique view and Instrument stage: Little Falls conditions.
  const klxl = metar?.["KLXL"] ?? null;
  const klxlConditions = useMemo(() => trafficConditions(klxl, { elevation: 1123, ident: "KLXL", lat: WX_FIELDS.KLXL.lat, lon: WX_FIELDS.KLXL.lon }, "13"), [klxl]);
  const [wxOpen, setWxOpen] = useState(false);
  const s = stages[active] ?? stages[0];
  if (!s) return null;
  return (
    <section ref={sectionRef} data-journey-section="" id={id} aria-label={label} className={`journey-section ${story ? "sticky top-0" : "relative"} bg-ink text-background`} data-story={story ? "" : undefined} style={{ height: story ? "100lvh" : `calc(${stages.length - 1 + JOURNEY_TAIL} * var(--journey-stage) + 100dvh)`, "--journey-count": stages.length } as React.CSSProperties}>
      <div ref={viewportRef} data-zoomed={zoomed ? "" : undefined} className={`journey-viewport sticky top-0 ${story ? "h-lvh" : "h-dvh"} overflow-hidden`} style={story ? { perspective: "1200px", touchAction: "none", overscrollBehavior: "none" } : undefined}>
        {story && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+3.6rem)] z-30 flex gap-1">
            {stages.map((st, i) => <button key={st.code} type="button" aria-label={`Show ${st.label}`} onClick={() => { setActive(i); const top = (sectionRef.current?.parentElement ?? sectionRef.current)?.getBoundingClientRect().top ?? 0; if (Math.abs(top) > 2) glideTo(window.scrollY + top); }} className="flex h-6 flex-1 items-center"><span className="block h-[3px] w-full overflow-hidden rounded-full bg-background/30"><span className="block h-full origin-left bg-primary transition-transform duration-300" style={{ transform: `scaleX(${i <= active ? 1 : 0})` }} /></span></button>)}
          </div>
        )}
        {story && hint && (
          <div aria-hidden className="story-hint pointer-events-none absolute inset-0 z-30">
            {/* Tap: a pulse where tapping advances (right side). */}
            <div className="story-hint-tap absolute right-[14%] top-[42%] flex flex-col items-center gap-2">
              <span className="story-hint-ring block size-12 rounded-full border-2 border-background/80 bg-background/15" />
              <span className="rounded-full bg-ink/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background/90 backdrop-blur-sm">Tap</span>
            </div>
            {/* Swipe: a fingertip dot that drags right to left with a trail. */}
            <div className="story-hint-swipe absolute inset-x-0 top-[42%] flex flex-col items-center gap-2">
              <span className="relative block h-12 w-40"><span className="story-hint-dot absolute right-0 top-1/2 block size-10 -translate-y-1/2 rounded-full bg-background/70" /><span className="story-hint-trail absolute right-5 top-1/2 block h-1 -translate-y-1/2 rounded-full bg-background/50" /></span>
              <span className="rounded-full bg-ink/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background/90 backdrop-blur-sm">Swipe</span>
            </div>
          </div>
        )}
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
          </>); })()}</div>}{s.traffic && <p className="mt-1 hidden sm:block">RWY {ops[active]?.rwy.runway ?? s.traffic.runway} · {ops[active]?.rwy.side ?? s.traffic.side} traffic · TPA {(s.traffic.elevation + (ops[active]?.pattern.tpaAgl ?? s.traffic.tpaAgl)).toLocaleString("en-US")} MSL</p>}</>}
          {(s.traffic || s.perspective) && <LiveOps ident={s.traffic?.ident ?? "KLXL"} elevation={s.traffic?.elevation ?? 1123} obs={s.traffic ? ops[active]?.obs ?? null : klxl} traffic={liveTraffic} />}
          <p className="mt-1 hidden sm:block">Stage {s.code} / 0{stages.length}</p>
        </div>

        {/* Stage rail */}
        <nav aria-label={`${label} stages`} className={`${story ? "sr-only " : ""}absolute right-4 sm:right-[max(var(--gutter),calc((100%-1720px)/2))] top-1/2 z-30 flex -translate-y-1/2 items-stretch gap-4`}>
          <div className="journey-stage-rail relative w-px overflow-hidden bg-background/20">
            <div ref={barRef} className="absolute inset-0 origin-top bg-primary" style={{ transform: "scaleY(0)" }} />
            <span aria-hidden="true" className="landing-scroll-stroke absolute inset-x-0 top-0 h-8 bg-background" />
          </div>
          <ol className="flex flex-col justify-between gap-1 sm:gap-3">
            {stages.map((st, i) => (
              <li key={st.code}>
                <Button variant="ghost" type="button" aria-label={st.label} aria-current={i === active ? "step" : undefined} onClick={() => jump(i)} className={`group h-11 min-w-11 justify-start gap-3 rounded-none px-2 text-left text-xs lg:text-[13px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-transparent ${i === active ? "outlined-accent-label" : "text-background/55 hover:text-background/80"}`}>
                  <span className={`size-2 rounded-full border border-current transition-[scale,background-color,border-color] ${i === active ? "scale-150 bg-primary border-primary" : ""}`} />
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
        <div className={`site-container journey-copy-wrap pointer-events-none absolute inset-x-0 bottom-0 z-20 ${story ? "pb-[calc(1.5rem+env(safe-area-inset-bottom)+100lvh-100dvh)]" : "pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-lg:!pr-14 "} sm:pb-24 md:pb-12 lg:pb-16`}>
          <div ref={copyRef} className="journey-copy max-w-2xl">
            <StageCopy s={s} wx={klxl} wxLoading={metar === undefined} />
          </div>
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

// Hybrid live-ops readout: real ADS-B traffic near the field when any is broadcasting, otherwise
// the simulated school pattern is labelled as such; live density altitude/climb from METAR. Client-only data.
function LiveOps({ ident, elevation, obs, traffic }: { ident: string; elevation: number; obs: Metar | null; traffic: Record<string, LiveAircraft[]> | null | undefined }) {
  // Only real, currently-reporting aircraft are shown; no performance numbers, no "quiet" placeholder.
  void obs; void elevation;
  const list = traffic?.[ident];
  const near = list?.[0];
  if (!near) return null;
  return (
    <div className="mt-1" data-live-ops>
      <p className="text-background" aria-live="polite">Live · {near.id} {near.altFt.toLocaleString("en-US")} FT {near.distNm} NM {compass(near.bearing)}{list.length > 1 ? ` · +${list.length - 1}` : ""}</p>
    </div>
  );
}
