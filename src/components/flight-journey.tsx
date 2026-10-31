import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyStop, journeyNearestLanding, JOURNEY_STAGE_SVH } from "../lib/journey-pacing";
import { airportTraffic } from "../lib/site-data";
import type { PatternAirport } from "../lib/traffic-pattern";
import { TrafficPattern } from "./traffic-pattern";
import instrumentVideo from "../assets/journey/instrument-imc-smooth.mp4.asset.json";
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

type Stage = { code: string; label: string; time: string; title: string; text: string; img: string; alt: string; cta: string; slug?: string; location?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number; video?: string; position?: string; traffic?: PatternAirport };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", text: "Left seat, instructor beside you.", img: clouds, alt: "Sunrise above a sea of clouds", cta: "Book an intro flight", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", text: "One focused block.", img: runway, alt: "Cockpit view on approach to Runway 13 at KLXL, with Runway 18/36 crossing just past the threshold", cta: "Private pilot details", slug: "private-pilot" },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Train in the real cockpit.", text: "Fly by reference to instruments.", img: instrument, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", position: "center", video: instrumentVideo.url, zoom: 0.2, zoomIn: 0.03 },
  { code: "04", label: "Commercial pilot", time: "5–7 days", title: "Fly professionally.", text: "Commercial standards in a focused block.", img: commercial, alt: "Lakes Area Aviation airplanes on the ramp at sunset", cta: "Commercial details", slug: "commercial-single-engine" },
  { code: "05", label: "CFI & CFII", time: "4–6 weeks", title: "Become the instructor.", text: "The exams: 1-hour oral and 1-hour flight.", img: instructor, alt: "Instructor and student inspecting a training airplane before flight", cta: "CFI & CFII track", slug: "cfi-cfii", position: "center" },
  { code: "06", label: "The right seat", time: "Your goal", title: "Build toward the airline flight deck.", text: "Every instructing hour moves you closer.", img: airline, alt: "Airline flight deck at night on final approach over city lights", cta: "Build my training plan", to: "/contact", video: airlineVideo.url, zoom: 0.2, zoomIn: 0.03 },
];

export const airportStages: Stage[] = [
  { code: "MN", label: "Little Falls", hud: "KLXL · 13129 Airport Rd", time: "KLXL", title: "Little Falls, Minnesota.", text: "Little Falls/Morrison County Airport", img: lf, alt: "USGS aerial of Little Falls/Morrison County Airport (KLXL), updated to show paved runways 13/31 and 18/36", cta: "Build my training plan", location: "KLXL", w: 1500, h: 1500, zoom: 0.4, zoomIn: 0.04, traffic: airportTraffic.KLXL },
  { code: "CO", label: "Fort Lupton", hud: "18V · 7507 Co Rd 39", time: "18V", title: "Fort Lupton, Colorado.", text: "Platte Valley Airpark", img: fl, alt: "Public-domain USGS aerial photo of Platte Valley Airpark (18V) runway, hangars and surrounding Colorado farm fields", cta: "Build my training plan", location: "18V", w: 1500, h: 1500, zoom: 0.12, zoomIn: 0.02, traffic: airportTraffic["18V"] },
  { code: "AZ", label: "Cottonwood", hud: "P52 · 1001 W Mingus Ave", time: "P52", title: "Cottonwood, Arizona.", text: "Cottonwood Municipal Airport", img: cw, alt: "Public-domain USGS aerial photo of Cottonwood Municipal Airport (P52) runway 14/32, ramp and surrounding Verde Valley terrain", cta: "Build my training plan", location: "P52", w: 1500, h: 1500, zoom: 0.18, zoomIn: 0.03, traffic: airportTraffic.P52 },
];

const snapOwners = new Set<Element>();
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
      // Snapping only engages between the first and last pages; the way in from
      // the section above and the way out below scroll 1:1 with the visitor.
      const along = -rect.top / total;
      const pinned = !reduce && along >= journeyStop(0, n) - 0.003 && along <= journeyStop(n - 1, n) + 0.003;
      if (pinned) snapOwners.add(el); else snapOwners.delete(el);
      root.classList.toggle("journey-snap", snapOwners.size > 0);
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
    const onScroll = renderScroll;
    // One page per swipe/flick is enforced by native mandatory snap stops (see
    // JSX), enabled on <html> only while this journey is pinned. A mouse wheel
    // notch steps exactly one page: the first event of a gesture glides to the
    // adjacent stop; following events are swallowed for a fixed, non-extending
    // window so trackpad inertia can't skip pages or freeze the page.
    const el = sectionRef.current;
    const root = document.documentElement;
    let lastWheel = 0, lastDelta = 0, lockUntil = 0;
    const stopTop = (i: number) => {
      if (!el) return 0;
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const total = Math.max(1, el.offsetHeight - vh);
      const base = window.scrollY + el.getBoundingClientRect().top;
      if (i < 0) return base - vh;
      if (i >= n) return base + total;
      return base + total * journeyStop(i, n);
    };
    const onWheel = (e: WheelEvent) => {
      if (!el || reduce || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (root.classList.contains("journey-free")) return;
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const rect = el.getBoundingClientRect();
      const dir = e.deltaY > 0 ? 1 : -1;
      if (!snapOwners.has(el)) return;
      const total = Math.max(1, el.offsetHeight - vh);
      const current = journeyNearestLanding(Math.max(0, Math.min(1, -rect.top / total)), n);
      // At the first/last page, leaving is plain native scrolling, 1:1.
      if ((dir > 0 && current >= n - 1) || (dir < 0 && current <= 0)) { release(); return; }
      const now = performance.now();
      const delta = Math.abs(e.deltaY);
      const fresh = now - lastWheel > 180 || delta > lastDelta * 1.6 + 4;
      lastWheel = now; lastDelta = delta;
      e.preventDefault();
      if (now < lockUntil || !fresh) return;
      lockUntil = now + 650;
      window.scrollTo({ top: stopTop(current + dir), behavior: "smooth" });
    };
    // Briefly lift snapping so an outward scroll at either end isn't pulled back.
    let releaseTimer = 0;
    const release = () => {
      root.classList.add("journey-free");
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => root.classList.remove("journey-free"), 900);
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      if (!el || reduce || !snapOwners.has(el) || e.touches.length !== 1) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      if (Math.abs(dy) < 6) return;
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const total = Math.max(1, el.offsetHeight - vh);
      const current = journeyNearestLanding(Math.max(0, Math.min(1, -el.getBoundingClientRect().top / total)), n);
      if ((dy > 0 && current >= n - 1) || (dy < 0 && current <= 0)) release();
    };
    const onJump = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; index: number }>).detail;
      if (d?.id === id) glideTo(stopTop(d.index), true);
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", renderScroll);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("journey:jump", onJump);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("journey:jump", onJump);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.clearTimeout(releaseTimer);
      if (el) snapOwners.delete(el);
      root.classList.toggle("journey-snap", snapOwners.size > 0);
      window.removeEventListener("scroll", onScroll);
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
  }, [active]);

  const jump = (i: number) => jumpToJourney(id, i);

  const s = stages[active] ?? stages[0];
  if (!s) return null;
  return (
    <section ref={sectionRef} id={id} aria-label={label} className="relative bg-ink text-background" style={{ height: `${stages.length * JOURNEY_STAGE_SVH + 100}svh` }}>
      {stages.map((st, i) => (
        <div key={`stop-${st.code}`} aria-hidden className="journey-stop journey-stop-page pointer-events-none absolute left-0 h-px w-px" style={{ top: `${journeyStop(i, stages.length) * stages.length * JOURNEY_STAGE_SVH}svh` }} />
      ))}
      <div ref={viewportRef} className="sticky top-0 h-svh overflow-hidden">
        {stages.map((st, i) => (
          <div key={st.code} ref={(el) => { layerRefs.current[i] = el; }} className="absolute -inset-[2%] will-change-transform backface-hidden" style={{ zIndex: stages.length - i }}>
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
                className="h-full w-full object-cover"
                style={{ objectPosition: st.position ?? "center" }}
              />
            ) : (
              <img src={st.img} alt={st.alt} width={st.w ?? 1920} height={st.h ?? 1088} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" style={{ objectPosition: st.position ?? "center" }} />
            )}
            {SHOW_TRAFFIC && st.traffic && <TrafficPattern airport={st.traffic} active={i === active} />}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/50" />
        <div className="journey-grain pointer-events-none absolute inset-0 z-10" />
        <div ref={fadeTopRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-ink" style={{ opacity: 0 }} />
        <div ref={fadeBottomRef} aria-hidden className={`pointer-events-none absolute inset-0 z-40 ${fadeBottom === "background" ? "bg-background" : "bg-ink"}`} style={{ opacity: 0 }} />

        {/* HUD */}
        <div className="absolute left-5 top-24 z-20 font-mono text-[11px] uppercase tracking-[0.2em] text-background/70 lg:left-8">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto max-w-7xl px-5 pb-24 pr-14 md:pb-12 lg:px-8 lg:pb-16">
          <div ref={copyRef} className="journey-copy max-w-2xl">
            <p className="eyebrow photo-label">{s.code} · {s.label}</p>
            <p className="mt-2 font-display text-4xl leading-none sm:mt-4 sm:text-7xl lg:text-8xl">{s.time}</p>
            <h2 className="mt-2 font-display text-xl leading-tight sm:mt-4 sm:text-4xl">{s.title}</h2>
            <p className="mt-1 max-w-lg truncate text-sm text-background/75 sm:mt-3 sm:text-base">{s.text}</p>
            {s.location
              ? <Link to="/contact" search={{ location: s.location }} className="interactive-arrow btn-shine pointer-events-auto mt-4 inline-flex min-h-10 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-6 sm:min-h-12 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : s.slug
              ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine pointer-events-auto mt-4 inline-flex min-h-10 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-6 sm:min-h-12 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine pointer-events-auto mt-4 inline-flex min-h-10 items-center gap-3 bg-primary px-4 text-[11px] sm:mt-6 sm:min-h-12 sm:px-6 sm:text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
          </div>
        </div>
      </div>
    </section>
  );
}
