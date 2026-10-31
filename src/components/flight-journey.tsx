import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyGestureTarget, journeyLanding, journeyNearestLanding, journeyShouldSettle, JOURNEY_GESTURE_LOCK_MS, JOURNEY_STAGE_SVH, JOURNEY_SWIPE_PX } from "../lib/journey-pacing";
import clouds from "../assets/journey/01-clouds.webp";
import runway from "../assets/journey/02-runway-corrected.webp";
import instrument from "../assets/journey/instrument-imc-cockpit.webp";
import instructor from "../assets/journey/04-instructor.webp";
import airline from "../assets/journey/05-airline.webp";
import lf from "../assets/journey/loc-little-falls.webp";
import fl from "../assets/journey/loc-fort-lupton.webp";
import cw from "../assets/journey/loc-cottonwood.webp";
import commercial from "../assets/photos/sunset-ramp.webp";

type Stage = { code: string; label: string; time: string; title: string; text: string; img: string; alt: string; cta: string; slug?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number; video?: string; position?: string };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", text: "Left seat, instructor beside you.", img: clouds, alt: "Sunrise above a sea of clouds", cta: "Book an intro flight", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", text: "One focused block.", img: runway, alt: "Aerial cockpit view of Runway 31 and intersecting Runway 18/36 at KLXL", cta: "Private pilot details", slug: "private-pilot" },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Train in the real cockpit.", text: "Fly by reference to instruments.", img: instrument, alt: "Real Lakes Area Aviation instrument panel flying through instrument conditions", cta: "Instrument details", slug: "instrument-rating", position: "center" },
  { code: "04", label: "Commercial pilot", time: "5–7 days", title: "Fly professionally.", text: "Commercial standards in a focused block.", img: commercial, alt: "Lakes Area Aviation airplanes on the ramp at sunset", cta: "Commercial details", slug: "commercial-single-engine" },
  { code: "05", label: "CFI & CFII", time: "4–6 weeks", title: "Become the instructor.", text: "The exams: 1-hour oral and 1-hour flight.", img: instructor, alt: "Instructor and student inspecting a training airplane before flight", cta: "CFI & CFII track", slug: "cfi-cfii", position: "center" },
  { code: "06", label: "The right seat", time: "Your goal", title: "Build toward the airline flight deck.", text: "Every instructing hour moves you closer.", img: airline, alt: "Airline flight deck at night above city lights", cta: "Build my training plan", to: "/contact" },
];

export const airportStages: Stage[] = [
  { code: "MN", label: "Little Falls", hud: "KLXL · 13129 Airport Rd", time: "KLXL", title: "Little Falls, Minnesota.", text: "Little Falls/Morrison County Airport", img: lf, alt: "Public-domain USGS aerial photo of Little Falls/Morrison County Airport (KLXL) with both runways, hangars and surrounding fields", cta: "See our locations", to: "/locations", w: 1500, h: 1500, zoom: 0.4, zoomIn: 0.04 },
  { code: "CO", label: "Fort Lupton", hud: "18V · 7507 Co Rd 39", time: "18V", title: "Fort Lupton, Colorado.", text: "Platte Valley Airpark", img: fl, alt: "Public-domain USGS aerial photo of Platte Valley Airpark (18V) runway, hangars and surrounding Colorado farm fields", cta: "See our locations", to: "/locations", w: 1500, h: 1500, zoom: 0.12, zoomIn: 0.02 },
  { code: "AZ", label: "Cottonwood", hud: "P52 · 1001 W Mingus Ave", time: "P52", title: "Cottonwood, Arizona.", text: "Cottonwood Municipal Airport", img: cw, alt: "Public-domain USGS aerial photo of Cottonwood Municipal Airport (P52) runway 14/32, ramp and surrounding Verde Valley terrain", cta: "Build my training plan", to: "/contact", w: 1500, h: 1500, zoom: 0.18, zoomIn: 0.03 },
];

type Props = { stages?: Stage[]; id?: string; label?: string; mode?: "alt" | "code" };

export function FlightJourney({ stages = journeyStages, id = "flight-path", label = "Your accelerated flight path", mode = "alt" }: Props = {}) {
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
    const n = stages.length;
    const render = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const total = Math.max(1, el.offsetHeight - viewportHeight);
      const state = journeyFrame(-rect.top / total, n);
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
    const onScroll = () => { renderScroll(); scheduleSettle(); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; renderScroll(); };
    // One gesture = one stage. Each step is an eased glide driven here (native
    // smooth scroll varies by browser and can crawl), and a fresh gesture during
    // a glide chains straight to the next stage, so the page never feels frozen.
    let anim = 0;
    let animTarget: number | null = null;
    let lastStepAt = -1e9;
    let lastWheelAt = 0;
    let lastWheelDelta = 0;
    const gestureProgress = () => {
      const el = sectionRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      if (rect.top > 0 || rect.bottom < vh) return null;
      const total = Math.max(1, el.offsetHeight - vh);
      return Math.max(0, Math.min(1, -rect.top / total));
    };
    // While gliding, gestures count from the stage being travelled to.
    const currentProgress = () => (animTarget !== null ? journeyLanding(animTarget, n) : gestureProgress());
    const stepTo = (target: number) => {
      const el = sectionRef.current;
      if (!el) return;
      const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const total = Math.max(1, el.offsetHeight - vh);
      const top = window.scrollY + el.getBoundingClientRect().top + total * journeyLanding(target, n);
      lastStepAt = performance.now();
      cancelAnimationFrame(anim);
      if (reduce) { anim = 0; animTarget = null; window.scrollTo({ top, behavior: "instant" }); return; }
      animTarget = target;
      const from = window.scrollY;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / JOURNEY_GLIDE_MS);
        window.scrollTo({ top: from + (top - from) * journeyEase(t), behavior: "instant" });
        if (t < 1) anim = requestAnimationFrame(tick);
        else { anim = 0; animTarget = null; }
      };
      anim = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      const progress = currentProgress();
      if (progress === null || e.deltaY === 0) return;
      const now = performance.now();
      const gapMs = now - lastWheelAt;
      const lastDelta = lastWheelDelta;
      lastWheelAt = now;
      lastWheelDelta = e.deltaY;
      const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      if (direction === 1 && animTarget === null && progress < journeyLanding(0, n)) return;
      const sinceStepMs = now - lastStepAt;
      const reversed = Math.sign(lastDelta) !== Math.sign(e.deltaY) && sinceStepMs > 120;
      const fresh = reversed || journeyWheelStartsGesture({ gapMs, delta: e.deltaY, lastDelta, sinceStepMs });
      const target = journeyGestureTarget(progress, n, direction);
      if (!fresh) {
        // Inertia from the gesture that already stepped: absorb it.
        if (anim || sinceStepMs < 1600) e.preventDefault();
        return;
      }
      if (target === null) return;
      e.preventDefault();
      stepTo(target);
    };
    let touchY = 0;
    let touchX = 0;
    let touchActive = false;
    let touchStepped = false;
    let touchTarget: number | null = null;
    let touchProgress: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchActive = !reduce && e.touches.length === 1 && Boolean(touch);
      touchTarget = null;
      touchStepped = false;
      touchProgress = touchActive ? currentProgress() : null;
      touchY = touch?.clientY ?? 0;
      touchX = touch?.clientX ?? 0;
      clearSettle();
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touchActive || !touch || touchProgress === null || e.touches.length !== 1) return;
      const dy = touchY - touch.clientY;
      if (Math.abs(dy) <= Math.abs(touchX - touch.clientX)) return;
      const target = journeyGestureTarget(touchProgress, n, dy > 0 ? 1 : -1);
      // Outward endpoint gestures and pinch/horizontal gestures stay native.
      if (target === null) return;
      if (e.cancelable) e.preventDefault();
      touchTarget = target;
      // Start gliding as soon as the swipe is clear — no waiting for the finger to lift.
      if (!touchStepped && Math.abs(dy) >= JOURNEY_SWIPE_PX) {
        touchStepped = true;
        stepTo(target);
      }
    };
    const onTouchCancel = () => { touchActive = false; touchTarget = null; touchProgress = null; };
    const onTouchEnd = (e: TouchEvent) => {
      const target = touchTarget;
      const stepped = touchStepped;
      onTouchCancel();
      if (target === null || stepped) return;
      // A short, quick flick still counts as one step.
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) >= 20) stepTo(target);
    };
    // Momentum catch-up: a fling that starts before the section pins scrolls
    // natively and can stop mid-stage. Once the scroll goes quiet while the
    // viewport is pinned, glide to the nearest stage landing.
    const SETTLE_DELAY_MS = 160;
    const SETTLE_TOLERANCE_PX = 40;
    let settleTimer = 0;
    const clearSettle = () => {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
    };
    const scheduleSettle = () => {
      clearSettle();
      if (anim) return;
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        if (reduce || touchActive || anim) return;
        const el = sectionRef.current;
        if (!el) return;
        const vh = viewportRef.current?.offsetHeight ?? window.innerHeight;
        const rect = el.getBoundingClientRect();
        if (rect.top > 0 || rect.bottom < vh) return;
        const total = Math.max(1, el.offsetHeight - vh);
        const progress = Math.max(0, Math.min(1, -rect.top / total));
        // Entry and exit bands scroll natively so visitors can always leave the journey.
        if (!journeyShouldSettle(progress, n)) return;
        const best = journeyNearestLanding(progress, n);
        const top = window.scrollY + rect.top + total * journeyLanding(best, n);
        if (Math.abs(top - window.scrollY) > SETTLE_TOLERANCE_PX) stepTo(best);
      }, SETTLE_DELAY_MS);
    };
    render();
    const viewportEl = viewportRef.current;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", renderScroll);
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    viewportEl?.addEventListener("wheel", onWheel, { passive: false });
    viewportEl?.addEventListener("touchstart", onTouchStart, { passive: true });
    viewportEl?.addEventListener("touchmove", onTouchMove, { passive: false });
    viewportEl?.addEventListener("touchend", onTouchEnd, { passive: true });
    viewportEl?.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(unlockTimer);
      window.clearTimeout(settleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", renderScroll);
      window.removeEventListener("pointermove", onMove);
      viewportEl?.removeEventListener("wheel", onWheel);
      viewportEl?.removeEventListener("touchstart", onTouchStart);
      viewportEl?.removeEventListener("touchmove", onTouchMove);
      viewportEl?.removeEventListener("touchend", onTouchEnd);
      viewportEl?.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [stages]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    videoRefs.current.forEach((video, videoIndex) => {
      if (!video) return;
      if (videoIndex === active && !reduce) void video.play().catch(() => undefined);
      else video.pause();
    });
  }, [active]);

  const jump = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const total = Math.max(1, el.offsetHeight - (viewportRef.current?.offsetHeight ?? window.innerHeight));
    const top = window.scrollY + el.getBoundingClientRect().top + total * journeyLanding(i, stages.length);
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  const s = stages[active] ?? stages[0];
  if (!s) return null;
  return (
    <section ref={sectionRef} id={id} aria-label={label} className="relative bg-ink text-background" style={{ height: `${stages.length * JOURNEY_STAGE_SVH + 100}svh` }}>
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
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/50" />
        <div className="journey-grain pointer-events-none absolute inset-0 z-10" />

        {/* HUD */}
        <div className="absolute left-5 top-24 z-20 font-mono text-[11px] uppercase tracking-[0.2em] text-background/70 lg:left-8">
          {mode === "alt" ? <p>Alt <span ref={hudRef} className="tabular-nums text-background">0</span> ft</p> : <p className="text-background">{s.hud}</p>}
          <p className="mt-1">Stage {s.code} / 0{stages.length}</p>
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto max-w-7xl px-5 pb-32 pr-16 md:pb-14 lg:px-8 lg:pb-20">
          <div ref={copyRef} className="journey-copy pointer-events-auto max-w-2xl">
            <p className="eyebrow photo-label">{s.code} · {s.label}</p>
            <p className="mt-4 font-display text-6xl leading-none sm:text-8xl">{s.time}</p>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{s.title}</h2>
            <p className="mt-3 max-w-lg text-background/75">{s.text}</p>
            {s.slug
              ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine mt-6 inline-flex min-h-12 items-center gap-3 bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine mt-6 inline-flex min-h-12 items-center gap-3 bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
          </div>
        </div>
      </div>
    </section>
  );
}
