import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { journeyFrame, journeyLanding, JOURNEY_STAGE_SVH } from "../lib/journey-pacing";
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

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

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
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; onScroll(); };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); window.removeEventListener("pointermove", onMove); };
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
        <nav aria-label={`${label} stages`} className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 items-stretch gap-4 lg:right-8">
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
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto max-w-7xl px-5 pb-32 pr-16 md:pb-14 lg:px-8 lg:pb-20">
          <div ref={copyRef} className="journey-copy max-w-2xl">
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
