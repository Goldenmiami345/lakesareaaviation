import { startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { srcSetFor } from "@/lib/responsive-image";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, MapPin, Pause, Phone, Play } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyAltitude, settleTarget, stageLanding, stageLengthFrom, JOURNEY_TAIL, JOURNEY_HOLD, DESKTOP_JOURNEY_HOLD, type JourneyGeometry } from "../lib/journey-scroll";
import { airportTraffic, SCHOOL_PHONE_TEL } from "../lib/site-data";
import { patternFor, pickRunway, type PatternField } from "../lib/traffic-pattern";
import { useMetar } from "../lib/use-metar";
import { profileAirport, trafficConditions, NO_CONDITIONS, type Metar } from "../lib/wx-conditions";
import { WX_FIELDS } from "../lib/wx-stations";
import { MetarLine, InstrumentConditions } from "./live-wx";
import { useStageZoom } from "../lib/stage-zoom";
import { useDesktopJourneyMode, useMobileJourneyMode } from "../lib/use-site-settings";
import { storyStep, STORY_HINT_TOTAL_MS, STORY_SWIPE_HINT_MS, STORY_TAP_HINT_MS } from "../lib/story-nav";
import { useStorySnap } from "../lib/story-snap";
import { PAGE_RETURN_START, pageReturnActive, returnToPageTop } from "../lib/page-return";
import { trafficCardIsOpen, trafficCardRecentlyOpen, useTrafficCardOpen } from "../lib/traffic-card-open";
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
import cfiTeaching from "../assets/journey/05-cfi-teaching.webp";
// Phone-only portrait variants: photos extended with AI fill around untouched original pixels;
// airport aerials widened with more real USGS NAIP imagery at the same scale and centre.
import cloudsPhone from "../assets/journey/01-clouds-phone.webp";
import runwayPhone from "../assets/journey/02-runway-corrected-phone.webp";
import instrumentPhone from "../assets/journey/instrument-imc-cockpit-phone.webp";
import instructorPhone from "../assets/journey/04-instructor-phone.webp";
import cfiTeachingPhone from "../assets/journey/05-cfi-teaching-phone.webp";
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

type Stage = { code: string; label: string; time: string; title: string; text?: string; img: string; alt: string; cta: string; slug?: string; location?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number; video?: string; position?: string; traffic?: PatternField; perspective?: boolean; liveWx?: boolean; phoneImg?: string; phoneView?: string; drift?: boolean };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", img: instructor, phoneImg: instructorPhone, alt: "Instructor walking a new student through the preflight beside a training airplane", cta: "Book an intro flight", position: "center", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", img: runway, phoneImg: runwayPhone, phoneView: "0 -700 1376 1468", alt: "Oblique view of Little Falls (KLXL): runway 13/31 with the full-length runway 18/36 crossing near the runway 13 end", cta: "Private pilot details", slug: "private-pilot", perspective: true, w: 1376, h: 768 },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Fly by reference to instruments.", img: instrument, phoneImg: instrumentPhone, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", position: "center", zoom: 0.2, zoomIn: 0.03, drift: true },
  { code: "04", label: "Commercial pilot", time: "5–7 days", title: "Fly professionally.", img: clouds, phoneImg: cloudsPhone, alt: "Wing and strut of a training airplane above a sea of clouds at sunrise", cta: "Commercial details", slug: "commercial-single-engine" },
  { code: "05", label: "CFI & CFII", time: "4–6 weeks", title: "Become the instructor. One hour oral, one hour flight.", img: cfiTeaching, phoneImg: cfiTeachingPhone, alt: "Flight instructor in the right seat pointing to the attitude indicator while a student flies", cta: "CFI & CFII track", slug: "cfi-cfii", position: "center" },
  { code: "06", label: "The right seat", time: "Your goal", title: "Build toward the airline flight deck.", img: airline, alt: "Airline flight deck at night on final approach over city lights", cta: "Build my training plan", to: "/contact", video: airlineVideo.url, zoom: 0.2, zoomIn: 0.03 },
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

/** Explicit Home action owns its smooth return, isolated from section locking. */
export function jumpToPageTop() {
  returnToPageTop();
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
  const desktopMode = useDesktopJourneyMode();
  // Computer equivalent (separate owner switch): an Apple-style auto-advancing carousel built on the same story engine.
  const carousel = desktopMode === "carousel" && !isPhone;
  const story = (journeyMode === "story" && isPhone) || carousel;
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const AUTO_MS = 5000; // Instagram's photo-story timer
  const [holding, setHolding] = useState(false);
  // Every 5s, looping back to the first stage after the last (owner request); finger down holds, computers can pause.
  // Auto-advance is only for visitors who haven't touched the stories yet; once they interact they stay as long as they like.
  const [interacted, setInteracted] = useState(false);
  // Reading an airplane's card holds the stage: nothing moves on while it is up.
  const cardOpen = useTrafficCardOpen();
  const autoOn = story && playing && inView && !holding && !interacted && !cardOpen;
  const activeRef = useRef(0);
  activeRef.current = active;
  const storyRef = useRef(story);
  storyRef.current = story;

  // Offstage = scrolled away, or (Story mode) fully covered by the next section sliding over it.
  // Marked with an attribute (no React render): traffic loops, videos and CSS animations idle there,
  // so the section on screen gets the whole frame budget while sections slide in and out.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let seen = false, full = false, covered = false, lastOff: boolean | null = null, lastIn: boolean | null = null;
    const apply = () => {
      const off = !seen || covered;
      if (off !== lastOff) {
        lastOff = off;
        el.toggleAttribute("data-offstage", off);
        const reduce = reducedMotion();
        videoRefs.current.forEach((v, i) => {
          if (!v) return;
          if (off || reduce || i !== activeRef.current) v.pause(); else void v.play().catch(() => undefined);
        });
      }
      const inV = full && !covered;
      if (storyRef.current && inV !== lastIn) { lastIn = inV; startTransition(() => setInView(inV)); }
    };
    const io = new IntersectionObserver(([en]) => { seen = !!en?.isIntersecting; full = seen && (en?.intersectionRatio ?? 0) > 0.9; apply(); }, { threshold: [0, 0.9] });
    io.observe(el);
    const next = el.nextElementSibling;
    // The next sibling spanning the top edge of the screen means it has slid completely over this section.
    const cover = next ? new IntersectionObserver(([en]) => { covered = !!en?.isIntersecting; apply(); }, { rootMargin: "0px 0px -99% 0px" }) : null;
    if (next) cover?.observe(next);
    return () => { io.disconnect(); cover?.disconnect(); el.removeAttribute("data-offstage"); };
  }, [story]);

  useEffect(() => {
    const el = sectionRef.current, viewport = viewportRef.current;
    if (!el || !viewport) return;
    if (story) return;
    const reduce = reducedMotion();
    const fine = window.matchMedia("(pointer: fine)").matches;
    const n = stages.length;
    let mx = 0, my = 0, frame = 0, last = -1;
    // Desktop: longer crossfade window and a short eased follow of scrollY so wheel notches blend.
    const hold = fine && !reduce ? DESKTOP_JOURNEY_HOLD : JOURNEY_HOLD;
    const ease = fine && !reduce;
    let shown = window.scrollY, lastT = 0;

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
      const target = window.scrollY;
      let more = false;
      if (ease) {
        const now = performance.now(), dt = lastT ? Math.min(64, now - lastT) : 16;
        lastT = now;
        // Ease toward the real scroll (~180ms); jumps larger than a screen land instantly.
        if (Math.abs(target - shown) > window.innerHeight * 1.5) shown = target;
        else shown += (target - shown) * (1 - Math.exp(-dt / 60));
        if (Math.abs(target - shown) < 0.5) { shown = target; lastT = 0; } else more = true;
      } else shown = target;
      const fr = journeyFrame(g, shown, hold);
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
      if (more) frame = requestAnimationFrame(render);
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
      if (pageReturnActive() || fingers > 0 || document.documentElement.classList.contains("journey-zoomed")) return;
      if (performance.now() - lastInputAt < INPUT_QUIET_MS) { scheduleSettle(); return; }
      const target = settleTarget(geo ?? measure(), window.scrollY, hold);
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
      const y = stageLanding(measure(), d.index, hold);
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
    const off = !!sectionRef.current?.hasAttribute("data-offstage");
    videoRefs.current.forEach((video, videoIndex) => {
      if (!video) return;
      if (videoIndex === active && !reduce && !off) void video.play().catch(() => undefined);
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
  // Taps and auto-advance crossfade; only a finger swipe turns the box.
  const swipeRef = useRef(false);
  const flatTimer = useRef(0);
  // Neighbour face: a static copy of the adjacent story's page placed beside this one, so crossing
  // sections turns one continuous cube instead of turning away to an empty screen first.
  const ghostRef = useRef<{ el: HTMLElement; at: number; src: HTMLElement } | null>(null);
  // Set by the gesture effect: places (or refreshes) the neighbour section's face beside this one.
  const warmGhostRef = useRef<((dir: 1 | -1) => void) | null>(null);
  // Stage the box last came to rest on; warm neighbours turn in from that side.
  const restPos = useRef(0);
  const dropGhost = () => { ghostRef.current?.el.remove(); ghostRef.current = null; };
  const faceTransform = (rel: number) => {
    const r = Math.max(-1, Math.min(1, rel));
    return `translate3d(${(r * 100).toFixed(3)}%,0,0) rotateY(${(r * 90).toFixed(3)}deg)`;
  };
  const paintStory = (pos: number, animate: boolean, fade = false) => {
    const reduce = reducedMotion();
    window.clearTimeout(flatTimer.current);
    const settled = Number.isInteger(pos);
    // 3D (perspective + hidden backfaces) exists only while the box is actually turning;
    // at rest every layer is a plain flat picture, so vertical slides composite cheaply.
    layerRefs.current.forEach((layer, i) => {
      if (!layer) return;
      const rel = i - pos;
      const vis = Math.abs(rel) < 1;
      const cur = Math.round(pos) === i;
      layer.style.pointerEvents = cur ? "auto" : "none";
      const warm = layer.hasAttribute("data-warm");
      const shown = !warm && layer.style.visibility === "visible" && layer.style.opacity !== "0";
      layer.removeAttribute("data-warm");
      if (reduce || fade) {
        // Simple crossfade: previous layer stays underneath while the new one fades in on top.
        // Warm neighbours (painted under the page at rest) never count as the page being shown.
        const wasVisible = shown;
        const keepWarm = !cur && !wasVisible && !reduce && Math.abs(rel) <= 1;
        layer.style.transition = animate && !keepWarm ? "opacity 260ms ease-out" : "none";
        layer.style.transform = "none";
        layer.style.zIndex = cur ? "60" : wasVisible ? "2" : keepWarm ? "1" : "";
        layer.style.visibility = cur || wasVisible || keepWarm ? "visible" : "hidden";
        layer.style.opacity = cur || wasVisible || keepWarm ? "1" : "0";
        if (keepWarm) layer.setAttribute("data-warm", "");
        if (cur && animate && !wasVisible) { layer.style.opacity = "0"; void layer.offsetWidth; layer.style.opacity = "1"; }
        return;
      }
      if (warm && vis) {
        // A warm neighbour lies flat under the page: put it on its cube edge before it turns in.
        const from = Math.sign(i - restPos.current) || 1;
        layer.style.transition = "none";
        layer.style.transformOrigin = from < 0 ? "100% 50%" : "0% 50%";
        layer.style.transform = faceTransform(from);
        void layer.offsetWidth;
      }
      // Instagram-style cube: each whole page (photo, copy, buttons, trail, altitude) is a face hinged on
      // its shared edge with the neighbour. Only GPU transforms change per frame; no layout, no filters.
      layer.style.zIndex = "";
      layer.style.transition = animate ? "transform 360ms cubic-bezier(0.22,0.61,0.36,1)" : "none";
      // A page that was on screen finishes its turn instead of vanishing the moment the finger lifts
      // (it used to disappear at release, so a quick flick showed dark navy beside the incoming page).
      const finishing = animate && shown && Math.abs(rel) <= 1;
      const on = vis || finishing;
      layer.style.visibility = on || cur ? "visible" : "hidden";
      layer.style.opacity = on ? "1" : "0";
      layer.style.backfaceVisibility = "hidden";
      layer.style.willChange = settled ? "" : "transform";
      // The hinge only moves when the face is actually turned: switching it on a face that is still
      // mid-turn (spring-back, backward swipes) made the page jump sideways at release.
      if (rel !== 0) layer.style.transformOrigin = rel < 0 ? "100% 50%" : "0% 50%";
      layer.style.transform = faceTransform(rel);
    });
    const g = ghostRef.current;
    if (g && (reduce || fade)) dropGhost();
    else if (g) {
      const rel = g.at - pos;
      const gWarm = g.el.hasAttribute("data-warm");
      const gShown = !gWarm && g.el.style.visibility === "visible" && g.el.style.opacity !== "0";
      const gOn = Math.abs(rel) < 1 || (animate && gShown && Math.abs(rel) <= 1);
      if (gWarm && gOn) {
        g.el.removeAttribute("data-warm");
        const from = Math.sign(g.at - restPos.current) || 1;
        g.el.style.transition = "none";
        g.el.style.transformOrigin = from < 0 ? "100% 50%" : "0% 50%";
        g.el.style.transform = faceTransform(from);
        void g.el.offsetWidth;
      }
      g.el.style.zIndex = "";
      g.el.style.transition = animate ? "transform 360ms cubic-bezier(0.22,0.61,0.36,1)" : "none";
      g.el.style.visibility = gOn ? "visible" : "hidden";
      g.el.style.opacity = gOn ? "1" : "0";
      if (rel !== 0) g.el.style.transformOrigin = rel < 0 ? "100% 50%" : "0% 50%";
      g.el.style.transform = faceTransform(rel);
    }
    const box = layerRefs.current[0]?.parentElement;
    if (box && !reduce && !fade) {
      box.style.perspective = `${Math.round(Math.max(800, box.clientWidth * 2.2))}px`;
      box.style.perspectiveOrigin = "50% 50%";
    }
    // At rest, drop all 3D so vertical scrolling composites one flat layer (3D layers flickered black while sliding).
    if (settled) {
      flatTimer.current = window.setTimeout(() => {
        // At rest the pages beside this one (and, on the first/last stage, the neighbouring section's
        // facing page) lie flat and painted under it, so the next turn starts from finished pictures.
        const n = stages.length;
        const want = reduce ? null : pos === n - 1 ? n : pos === 0 ? -1 : null;
        if (ghostRef.current && ghostRef.current.at !== want) dropGhost();
        if (want !== null) warmGhostRef.current?.(want > 0 ? 1 : -1);
        restPos.current = pos;
        const b = layerRefs.current[0]?.parentElement;
        if (b) b.style.perspective = "";
        layerRefs.current.forEach((layer, i) => {
          if (!layer) return;
          const near = !reduce && Math.abs(i - pos) === 1;
          layer.style.transition = "none";
          layer.style.transform = "none";
          layer.style.transformOrigin = "";
          layer.style.willChange = "";
          layer.style.backfaceVisibility = "";
          layer.style.zIndex = i === pos ? "3" : near ? "2" : "";
          layer.style.opacity = i === pos || near ? "1" : "0";
          layer.style.visibility = i === pos || near ? "visible" : "hidden";
          if (near) layer.setAttribute("data-warm", ""); else layer.removeAttribute("data-warm");
        });
        const g = ghostRef.current;
        if (g) {
          g.el.style.transition = "none";
          g.el.style.transform = "none";
          g.el.style.transformOrigin = "";
          g.el.style.zIndex = "1";
          g.el.style.opacity = "1";
          g.el.style.visibility = "visible";
          g.el.setAttribute("data-warm", "");
        }
      }, animate ? 380 : 0);
    }
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
    paintStory(active, true, !carousel && !swipeRef.current);
    swipeRef.current = false;
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
    // Brief, separate swipe and tap cues on first arrival. Any touch dismisses them.
    // Each section owns its once-per-visit flag; neither cue intercepts gestures.
    let inView = false, timer = 0, shown = false, hide = 0;
    const arm = () => { window.clearTimeout(timer); window.clearTimeout(hide); setHint(false); if (inView && !shown) timer = window.setTimeout(() => { if (trafficCardIsOpen()) return; shown = true; setHint(true); hide = window.setTimeout(() => setHint(false), STORY_HINT_TOTAL_MS); }, 600); };
    const io = new IntersectionObserver(([en]) => { inView = !!en?.isIntersecting && en.intersectionRatio > 0.85; arm(); }, { threshold: [0.85] });
    io.observe(vp);
    vp.addEventListener("pointerdown", arm);
    return () => { root.classList.remove("story-mode"); io.disconnect(); window.clearTimeout(timer); window.clearTimeout(hide); vp.removeEventListener("pointerdown", arm); };
  }, [story]);
  // Phone stories: up/down between sections is native scrolling locked by CSS scroll snap (story-snap.ts).
  useStorySnap(story && !carousel);
  useEffect(() => {
    if (!story) return;
    const el = sectionRef.current, viewport = viewportRef.current;
    if (!el || !viewport) return;
    const n = stages.length;
    // Story sections are sticky so the next one slides up over them; measure from the in-flow wrapper.
    const box = () => (el.parentElement ?? el).getBoundingClientRect();
    let exitTimer = 0;
    const cancelExit = () => { window.clearTimeout(exitTimer); paintStory(activeRef.current, false); };
    window.addEventListener(PAGE_RETURN_START, cancelExit);
    // Next section starts where this sticky wrapper ends (its snap anchor).
    // Forward past the last stage = the next story: this page turns away like a cube face, then the
    // next section is placed instantly (no vertical smooth scroll fighting snap, which glitched on iOS)
    // and turns in from the right. Up/down/back swipes there behave as on any section.
    // The adjacent snap anchor (forward: next below; back: previous above) and its element.
    const neighbour = (dir: 1 | -1) => {
      const here = window.scrollY + box().top;
      const anchors = Array.from(document.querySelectorAll<HTMLElement>(".story-snap")).map((a) => ({ a, y: window.scrollY + a.getBoundingClientRect().top }));
      return dir > 0
        ? anchors.filter((x) => x.y > here + 4).sort((p, q) => p.y - q.y)[0]
        : anchors.filter((x) => x.y < here - 4).sort((p, q) => q.y - p.y)[0];
    };
    // Copy the neighbouring story's facing page in beside this one (forward: its current page; back: its last).
    // check: re-verify an existing copy still shows the neighbour's current page (it may have moved on).
    const makeGhost = (dir: 1 | -1, check = false) => {
      const at = dir > 0 ? n : -1;
      if (ghostRef.current?.at === at && !check) return true;
      if (reducedMotion()) { dropGhost(); return false; }
      const sec = neighbour(dir)?.a.nextElementSibling;
      if (!(sec instanceof HTMLElement) || !sec.matches("section[data-story]")) { dropGhost(); return false; }
      const faces = sec.querySelectorAll<HTMLElement>(".journey-viewport > .journey-layer:not([data-ghost])");
      const src = dir > 0 ? (sec.querySelector<HTMLElement>(".journey-viewport > .journey-layer[data-active]") ?? faces[0]) : faces[faces.length - 1];
      if (ghostRef.current?.at === at && ghostRef.current.src === src) return true;
      dropGhost();
      const last = layerRefs.current[n - 1];
      if (!src || !last) return false;
      const el = src.cloneNode(true) as HTMLElement;
      el.removeAttribute("data-active");
      el.removeAttribute("data-warm");
      el.setAttribute("data-ghost", "");
      el.setAttribute("aria-hidden", "true");
      el.inert = true;
      el.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
      el.style.cssText = "";
      el.style.pointerEvents = "none";
      el.style.backfaceVisibility = "hidden";
      el.style.willChange = "transform";
      el.style.transition = "none";
      el.style.transformOrigin = dir > 0 ? "0% 50%" : "100% 50%";
      el.style.transform = faceTransform(dir);
      el.style.visibility = "hidden";
      last.after(el);
      void el.offsetWidth;
      ghostRef.current = { el, at, src };
      return true;
    };
    warmGhostRef.current = (dir) => { makeGhost(dir, true); };
    const exitSection = () => {
      // The next snap anchor below this section (the wrapper's bottom can sit past the next section).
      const target = neighbour(1)?.y ?? window.scrollY + box().bottom;
      const reduce = reducedMotion();
      const ghost = makeGhost(1);
      if (!reduce) paintStory(n - 0.001, true);
      window.clearTimeout(exitTimer);
      // With the neighbour face turned fully in, the page swap underneath is invisible: no second turn.
      exitTimer = window.setTimeout(() => { jumpTo(target, "story:enter", reduce || ghost); }, reduce ? 0 : ghost ? 380 : 340);
    };
    // Place the page instantly with snapping paused for the jump, so snap can't pull it elsewhere mid-move.
    const jumpTo = (target: number, enterEvent: string, reduce: boolean) => {
      if (pageReturnActive()) return;
      const root = document.documentElement;
      const snapped = root.classList.contains("story-snapping");
      root.classList.remove("story-snapping");
      window.scrollTo({ top: target, behavior: "instant" });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (snapped && root.classList.contains("story-phone")) root.classList.add("story-snapping");
        if (Math.abs(window.scrollY - target) > 2) window.scrollTo({ top: target, behavior: "instant" });
      }));
      window.dispatchEvent(new CustomEvent("journey-target", { detail: target }));
      window.dispatchEvent(new CustomEvent(enterEvent, { detail: { top: target, animate: !reduce } }));
      window.setTimeout(() => paintStory(activeRef.current, false), 60);
    };
    // Backward before the first stage = the previous story (if the section above is one), entering at its last stage.
    const backSection = () => {
      const target = neighbour(-1)?.y;
      const claim = { top: target, claimed: false };
      if (target !== undefined) window.dispatchEvent(new CustomEvent("story:claim", { detail: claim }));
      if (!claim.claimed) { dropGhost(); paintStory(activeRef.current, true); return false; }
      const reduce = reducedMotion();
      const ghost = makeGhost(-1);
      if (!reduce) paintStory(-0.999, true);
      window.clearTimeout(exitTimer);
      exitTimer = window.setTimeout(() => jumpTo(target as number, "story:enter-back", reduce || ghost), reduce ? 0 : ghost ? 380 : 340);
      return true;
    };
    const onClaim = (e: Event) => {
      const d = (e as CustomEvent<{ top: number; claimed: boolean }>).detail;
      if (Math.abs(window.scrollY + box().top - d.top) <= 4) d.claimed = true;
    };
    window.addEventListener("story:claim", onClaim);
    const onEnter = (e: Event) => {
      const { top, animate } = (e as CustomEvent<{ top: number; animate: boolean }>).detail;
      if (Math.abs(window.scrollY + box().top - top) > 4) return;
      const back = e.type === "story:enter-back";
      if (back) {
        activeRef.current = n - 1;
        // Arriving under a finished cube turn: show the last page flat at once (no crossfade from the old one).
        if (!animate) { swipeRef.current = true; paintStory(n - 1, false); }
        setActive(n - 1);
      }
      if (!animate) return;
      const a = activeRef.current;
      window.clearTimeout(flatTimer.current);
      const b = layerRefs.current[0]?.parentElement;
      if (b) { b.style.perspective = `${Math.round(Math.max(800, b.clientWidth * 2.2))}px`; b.style.perspectiveOrigin = "50% 50%"; }
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        layer.style.transition = "none";
        layer.style.visibility = i === a ? "visible" : "hidden";
        layer.style.opacity = i === a ? "1" : "0";
        if (i !== a) return;
        layer.style.backfaceVisibility = "hidden";
        layer.style.willChange = "transform";
        layer.style.transformOrigin = back ? "100% 50%" : "0% 50%";
        layer.style.transform = back ? "translate3d(-100%,0,0) rotateY(-90deg)" : "translate3d(100%,0,0) rotateY(90deg)";
      });
      void layerRefs.current[a]?.offsetWidth;
      paintStory(a, true);
    };
    window.addEventListener("story:enter", onEnter);
    window.addEventListener("story:enter-back", onEnter);
    const go = (dir: 1 | -1) => {
      if (carousel) { setPlaying(false); setActive((a) => (a + dir + n) % n); return; }
      const next = storyStep(activeRef.current, n, dir);
      if (next === "exit") { swipeRef.current = false; paintStory(activeRef.current, true); exitSection(); return; }
      if (next === "back") { swipeRef.current = false; backSection(); return; }
      if (next === activeRef.current) { swipeRef.current = false; paintStory(next, true); return; }
      setActive(next);
    };
    let sx = 0, sy = 0, axis: "x" | "y" | null = null, down = false, dx = 0, vx = 0, lx = 0, ly = 0, lt = 0;
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a,button,input,select,textarea,[role=button],[data-interactive],.journey-hud,nav,svg [tabindex]");
    // A tap that only puts an airplane's info card away must never flip the stage. The flag is read
    // at the very start of the gesture (window capture runs before the card's own document-capture
    // close), and every pointerdown re-assigns it, so it is never stale.
    const cardTap = { open: false };
    const onDownCapture = () => { cardTap.open = trafficCardIsOpen(); };
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || document.documentElement.classList.contains("journey-zoomed")) return;
      // A neighbour-section copy made earlier may be stale if that section has moved on since.
      const g = ghostRef.current;
      if (g) makeGhost(g.at > 0 ? 1 : -1, true);
      down = true; axis = null; dx = 0; vx = 0; sx = lx = e.clientX; sy = ly = e.clientY; lt = performance.now(); if (!carousel) startTransition(() => { setHolding(true); setInteracted(true); });
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (document.documentElement.classList.contains("journey-zoomed") || !e.isPrimary) { down = false; return; }
      const now = performance.now(), dt = Math.max(1, now - lt);
      // Smoothed horizontal release velocity (px/ms) from the latest movement only, so a drag that reverses follows the last direction.
      vx = vx * 0.4 + ((e.clientX - lx) / dt) * 0.6;
      lx = e.clientX; ly = e.clientY; lt = now;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!axis && Math.hypot(mx, my) > 8) {
        axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        if (axis === "x") try { viewport.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      // Vertical belongs to the browser's own scrolling (snap-locked in Story mode); never moved by script.
      if (axis === "y") { down = false; startTransition(() => setHolding(false)); return; }
      if (axis !== "x") return;
      dx = mx;
      const w = viewport.offsetWidth || 1;
      let t = -dx / w;
      const a = activeRef.current;
      // Backward at the first stage turns toward the previous section (rubber-band if there is none above).
      // At the last stage a forward drag turns this page away while the next section's page turns in beside it.
      const p = a + Math.max(-1, Math.min(1, t));
      if (p > n - 1) makeGhost(1);
      else if (p < 0) makeGhost(-1);
      paintStory(p, false);
    };
    const onUp = (e: PointerEvent) => {
      startTransition(() => setHolding(false));
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
        if (dir) { swipeRef.current = true; go(dir as 1 | -1); } else paintStory(activeRef.current, true);
        return;
      }
      if (axis === null && !interactive(e.target)) {
        // This tap only closed an airplane's card: it must not also move the stage.
        if (cardTap.open || trafficCardRecentlyOpen()) { cardTap.open = false; return; }
        // Tapping while caught between two sections first snaps this one into place.
        const top = box().top;
        if (Math.abs(top) > 2) { glideTo(window.scrollY + top); return; }
        go(e.clientX < w * 0.3 ? -1 : 1);
      }
    };
    const onCancel = () => { startTransition(() => setHolding(false)); if (down) { down = false; paintStory(activeRef.current, true); } };
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number; animate?: boolean }>).detail;
      if (d?.id !== id) return;
      setActive(Math.max(0, Math.min(n - 1, d.index)));
      // Location shortcuts (hero chips, "Our locations"): place the section the same way section exits do,
      // with snapping paused for the move. A smooth or snapped programmatic scroll across several
      // snap-stop anchors is cancelled or caught by iPhone Safari, so the buttons appeared dead there.
      const target = window.scrollY + box().top;
      if (Math.abs(box().top) <= 2) return;
      jumpTo(target, "story:enter", true);
    };
    const noDrag = (e: Event) => e.preventDefault(); // native image drag would steal the pointer mid-swipe
    viewport.addEventListener("dragstart", noDrag);
    viewport.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerdown", onDownCapture, true);
    viewport.addEventListener("pointermove", onMove, { passive: true });
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onCancel);
    window.addEventListener("journey:jump", onJump);
    return () => {
      window.clearTimeout(exitTimer);
      dropGhost();
      warmGhostRef.current = null;
      window.removeEventListener(PAGE_RETURN_START, cancelExit);
      viewport.removeEventListener("dragstart", noDrag);
      viewport.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerdown", onDownCapture, true);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("journey:jump", onJump);
      window.removeEventListener("story:enter", onEnter);
      window.removeEventListener("story:enter-back", onEnter);
      window.removeEventListener("story:claim", onClaim);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, carousel, stages, id]);

  useEffect(() => {
    if (!story) return;
    const vp = viewportRef.current;
    if (!vp) return;
    // inView (autoplay) comes from the offstage observer above, which also knows when a section is covered.
    if (!carousel) { if (reducedMotion()) setPlaying(false); return; }
    if (reducedMotion()) setPlaying(false);
    const n = stages.length;
    const step = (dir: 1 | -1) => setActive((a) => (a + dir + n) % n);
    const onKey = (e: KeyboardEvent) => {
      const r = vp.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.4 || r.bottom < window.innerHeight * 0.6) return;
      if ((e.target as Element | null)?.closest?.("input,textarea,select")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setPlaying(false); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setPlaying(false); step(-1); }
    };
    // Two-finger sideways swipe on a trackpad turns one stage; vertical scrolling stays native.
    let acc = 0, cool = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < cool) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 50) { setPlaying(false); step(acc > 0 ? 1 : -1); acc = 0; cool = now + 700; }
    };
    window.addEventListener("keydown", onKey);
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("keydown", onKey); vp.removeEventListener("wheel", onWheel); };
  }, [story, carousel, stages.length]);
  useEffect(() => {
    if (!autoOn) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % stages.length), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [autoOn, active, stages.length]);
  const { zoomed, reset } = useStageZoom({ viewportRef, target: () => layerRefs.current[active]?.querySelector<HTMLElement>(".journey-zoom") ?? null, resetKey: active });
  const metar = useMetar();
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
  const phoneStory = story && !carousel;
  // Phone stories: trail + altitude live inside each card so the whole page turns with the swipe (Instagram-style).
  const trail = (cur: number) => (
          <div className={carousel ? "absolute bottom-[2.6rem] left-1/2 z-30 flex w-[min(28rem,40vw)] -translate-x-1/2 gap-1.5" : "absolute inset-x-3 top-[calc(env(safe-area-inset-top)+3.6rem)] z-30 flex gap-1"}>
            {stages.map((st, i) => <button key={st.code} type="button" aria-label={`Show ${st.label}`} onClick={() => { setActive(i); const top = (sectionRef.current?.parentElement ?? sectionRef.current)?.getBoundingClientRect().top ?? 0; if (Math.abs(top) > 2) glideTo(window.scrollY + top); }} className="flex h-6 flex-1 items-center"><span className="block h-[3px] w-full overflow-hidden rounded-full bg-background/30"><span key={i === cur && autoOn ? "run" : "idle"} className={`block h-full origin-left bg-primary ${i === cur && autoOn ? "carousel-fill" : "transition-transform duration-300"}`} style={i === cur && autoOn ? { animationDuration: `${AUTO_MS}ms` } : { transform: `scaleX(${i <= cur ? 1 : 0})` }} /></span></button>)}
          </div>
  );
  return (
    <section ref={sectionRef} data-journey-section="" id={id} aria-label={label} className={`journey-section ${story ? "sticky top-0" : "relative"} bg-ink text-background`} data-story={story ? "" : undefined} style={{ height: story ? "100lvh" : `calc(${stages.length - 1 + JOURNEY_TAIL} * var(--journey-stage) + 100dvh)`, "--journey-count": stages.length } as React.CSSProperties}>
      <div ref={viewportRef} data-zoomed={zoomed ? "" : undefined} className={`journey-viewport sticky top-0 ${story ? "h-lvh" : "h-dvh"} overflow-hidden`} >
        {story && carousel && trail(active)}
        {carousel && (
          <div data-interactive="" className="absolute bottom-8 right-[max(var(--gutter),calc((100%-1720px)/2))] z-30 flex items-center gap-1 rounded-full bg-ink/45 p-1 text-background backdrop-blur-md">
            <button type="button" aria-label="Previous stage" onClick={() => { setPlaying(false); setActive((a) => (a - 1 + stages.length) % stages.length); }} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-background/15"><ChevronLeft className="size-5" /></button>
            <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-background/15">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
            <button type="button" aria-label="Next stage" onClick={() => { setPlaying(false); setActive((a) => (a + 1) % stages.length); }} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-background/15"><ChevronRight className="size-5" /></button>
          </div>
        )}
        {/* Safari tints its toolbar from the pixels at the screen's bottom edge; keep that edge plain dark ink so buttons never bleed a hard blue line into it. */}
        {/* Story copy lives inside each layer, so there the strip is drawn per layer beneath the copy (a z-10 strip here covered the buttons). */}
        {!story && <div aria-hidden className="journey-edge-ink pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(4.5rem+env(safe-area-inset-bottom)+100lvh-100dvh)] bg-gradient-to-t from-ink via-ink/80 to-transparent sm:hidden" />}
        {story && !carousel && hint && (
          <div aria-hidden className="story-hint pointer-events-none absolute right-3 top-[36%] z-30 h-14 w-11 text-background" style={{ "--hint-swipe": `${STORY_SWIPE_HINT_MS}ms`, "--hint-tap": `${STORY_TAP_HINT_MS}ms` } as React.CSSProperties}>
            <div className="story-hint-swipe absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-ink/65">
              <span className="story-hint-chevrons flex items-center"><ChevronLeft className="size-4" strokeWidth={2} /><ChevronLeft className="-ml-2 size-4" strokeWidth={2} /></span>
              <span className="text-[9px] font-semibold uppercase">Swipe</span>
            </div>
            <div className="story-hint-tap absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md bg-ink/65">
              <span className="relative grid size-6 place-items-center"><span className="story-hint-ring absolute inset-0 rounded-full border border-background/80" /><span className="size-1.5 rounded-full bg-background" /></span>
              <span className="text-[9px] font-semibold uppercase">Tap</span>
            </div>
          </div>
        )}
        {stages.map((st, i) => (
          <div key={st.code} ref={(el) => { layerRefs.current[i] = el; }} className={`journey-layer absolute inset-0 bg-ink${story ? "" : " backface-hidden"}`} data-active={i === active ? "" : undefined} inert={(story && i !== active) || undefined} style={{ zIndex: stages.length - i }}>
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
            {story && <>
              {phoneStory && trail(i)}
              {phoneStory && mode === "alt" && <p aria-hidden={i !== active || undefined} className="absolute left-5 top-24 z-20 font-mono text-xs uppercase tracking-[0.2em] text-background/70">Alt <span className="tabular-nums text-background">{journeyAltitude({ stage: i, next: i, transition: 0 }, stages.length).toLocaleString("en-US")}</span> ft</p>}
              <div className="journey-shade pointer-events-none absolute inset-0 transition-opacity duration-300" />
              <div aria-hidden className="journey-edge-ink pointer-events-none absolute inset-x-0 bottom-0 h-[calc(4.5rem+env(safe-area-inset-bottom)+100lvh-100dvh)] bg-gradient-to-t from-ink via-ink/80 to-transparent sm:hidden" />
              <div inert={i !== active || undefined} className="site-container journey-copy-wrap pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(.75rem+env(safe-area-inset-bottom)+100lvh-100dvh)] sm:pb-24 md:pb-12 lg:pb-16">
                <div className="journey-copy max-w-2xl"><StageCopy s={st} wx={klxl} wxLoading={metar === undefined} /></div>
              </div>
            </>}
          </div>
        ))}
        {!story && <div className="journey-shade pointer-events-none absolute inset-0 z-10 transition-opacity duration-300" />}
        
        <div ref={fadeTopRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-ink" style={{ opacity: 0 }} />
        <div ref={fadeBottomRef} aria-hidden className={`pointer-events-none absolute inset-0 z-40 ${fadeBottom === "background" ? "bg-background" : "bg-ink"}`} style={{ opacity: 0 }} />

        {/* HUD */}
        <div className={`journey-hud ${phoneStory && mode === "alt" ? "hidden " : ""}absolute left-5 sm:left-[max(var(--gutter),calc((100%-1720px)/2))] top-24 z-20 font-mono text-xs uppercase tracking-[0.2em] text-background/70 lg:text-[13px]`}>
          {mode === "alt" ? <p>Alt <span ref={hudRef} className="tabular-nums text-background">0</span> ft</p> : <><p className="text-background">{s.hud}</p>{s.traffic && <div className="wx-hud-slot">{(() => { const o = ops[active]; if (!o?.obs) return null; const w = o.obs; return (<>
            <button type="button" onClick={() => setWxOpen((v) => !v)} aria-expanded={wxOpen} className="pointer-events-auto flex min-h-11 items-center gap-1.5 text-left uppercase tracking-[inherit] text-background sm:pointer-events-none sm:cursor-default" data-wind aria-label={`Wind at ${w.station}: ${w.dir === null ? (w.kt ? "variable" : "calm") : `${w.dir} degrees`} ${w.kt} knots${w.gust ? ` gusting ${w.gust}` : ""}. Active runway ${o.rwy.runway}. ${wxOpen ? "Hide" : "Show"} full METAR`}>
              {w.dir !== null && w.kt > 0 && <svg viewBox="0 0 12 12" className="size-3 text-[color:var(--radar)]" style={{ transform: `rotate(${w.dir + 180}deg)` }} aria-hidden><path d="M6 1v10M2.5 4.5 6 1l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>}
              <span>Wind {w.kt === 0 ? "calm" : `${w.dir === null ? "VRB" : String(w.dir).padStart(3, "0") + "°"} ${w.kt}${w.gust ? `G${w.gust}` : ""}KT`}</span>
              <span className="text-background/60">{w.station} · RWY {o.rwy.runway}</span>
              <span aria-hidden className="text-background/60 sm:hidden">{wxOpen ? "▴" : "▾"}</span>
            </button>
            <p className={`mt-1 max-w-[min(34rem,calc(100vw-6rem))] ${wxOpen ? "" : "max-sm:hidden"}`}><MetarLine obs={w} /></p>
          </>); })()}</div>}{s.traffic && <p className="mt-1 hidden sm:block">RWY {ops[active]?.rwy.runway ?? s.traffic.runway} · {ops[active]?.rwy.side ?? s.traffic.side} traffic · TPA {(s.traffic.elevation + (ops[active]?.pattern.tpaAgl ?? s.traffic.tpaAgl)).toLocaleString("en-US")} MSL</p>}</>}
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
        {!story && <div className="site-container journey-copy-wrap pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-[calc(2.75rem+env(safe-area-inset-bottom))] max-lg:!pr-14 sm:pb-24 md:pb-12 lg:pb-16">
          <div ref={copyRef} className="journey-copy max-w-2xl">
            <StageCopy s={s} wx={klxl} wxLoading={metar === undefined} />
          </div>
        </div>}

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
      {s.text && <p className="mt-1 max-w-lg text-pretty text-sm leading-snug text-background/80 sm:mt-2 sm:text-base">{s.text}</p>}
      {s.code === "01" && !s.location && <DiscoveryLocations />}
      {s.liveWx && <InstrumentConditions obs={wx} loading={wxLoading} />}
      <div className="flex flex-nowrap items-end gap-2">
      {s.location
        ? <Link to="/contact" search={{ location: s.location }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
        : s.slug
        ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
        : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap bg-primary px-3 text-xs max-sm:tracking-[0.06em] sm:gap-3 sm:mt-4 sm:min-h-11 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
      <a href={SCHOOL_PHONE_TEL} aria-label="Call Lakes Area Aviation" className="pointer-events-auto mt-2.5 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border border-background/50 px-3 text-xs font-bold uppercase tracking-[0.06em] text-background backdrop-blur-sm sm:hidden"><Phone className="size-4" /> Call</a>
      </div>
      {!s.location && s.code !== "01" && <LocationsSkip end={s.code === "06"} />}
    </>
  );
}

const TRAINING_STATES = [["Minnesota", "MN"], ["Colorado", "CO"], ["Arizona", "AZ"]] as const;

/** Skip ahead to the airport section (smooth glide; index = airportStages order). */
const toAirport = (index: number) => jumpToJourney("airports", index, true);

/** Discovery stage: names the three places a first flight can happen, each one a shortcut to its airport. */
function DiscoveryLocations() {
  return (
    <p className="mt-1 flex flex-wrap items-center text-xs leading-snug text-background/80 sm:mt-2 sm:text-sm">
      <span className="mr-1"><span className="max-sm:hidden">Take a discovery flight at one of our three locations:</span><span className="sm:hidden">At our 3 locations:</span></span>
      {TRAINING_STATES.map(([state, code], i) => (
        <span key={code} className="inline-flex items-center">
          {i > 0 && <span aria-hidden className="px-1 text-background/40">·</span>}
          <button type="button" onClick={() => toAirport(i)} aria-label={`See our ${state} location`} className="pointer-events-auto -my-2 inline-flex min-h-10 items-center font-semibold text-background underline decoration-background/30 underline-offset-4 transition-colors hover:text-primary-text hover:decoration-current">
            <span className="sm:hidden">{code}</span><span className="max-sm:hidden">{state}</span>
          </button>
        </span>
      ))}
    </p>
  );
}

/** Quiet shortcut to the airports on every later stage; the final stage points down to them. */
function LocationsSkip({ end }: { end: boolean }) {
  return (
    <button type="button" onClick={() => toAirport(0)} className="pointer-events-auto -mb-2 mt-0.5 inline-flex min-h-10 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-background/70 transition-colors hover:text-background sm:mt-1.5 sm:text-[11px]">
      {end
        ? <>Scroll to see our locations <ArrowDown aria-hidden className="scroll-arrow size-3.5" /></>
        : <><MapPin aria-hidden className="size-3 text-background/55" /> Our locations · MN · CO · AZ</>}
    </button>
  );
}

