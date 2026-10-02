import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import clouds from "../assets/journey/01-clouds.webp";
import runway from "../assets/journey/02-runway-corrected.webp";
import instrument from "../assets/journey/03-instrument.webp";
import instructor from "../assets/journey/04-instructor.webp";
import airline from "../assets/journey/05-airline.webp";
import lf from "../assets/journey/loc-little-falls.webp";
import fl from "../assets/journey/loc-fort-lupton.webp";
import cw from "../assets/journey/loc-cottonwood.webp";
import commercial from "../assets/photos/sunset-ramp.webp";

type Stage = { code: string; label: string; time: string; title: string; text: string; img: string; alt: string; cta: string; slug?: string; to?: "/introductory-flights" | "/contact" | "/locations"; hud?: string; zoom?: number; zoomIn?: number; w?: number; h?: number };

const journeyStages: Stage[] = [
  { code: "01", label: "Discovery flight", time: "$100", title: "Take the controls on day one.", text: "Left seat, instructor beside you.", img: clouds, alt: "Sunrise above a sea of clouds", cta: "Book an intro flight", to: "/introductory-flights" },
  { code: "02", label: "Private pilot", time: "~21 days", title: "Your first certificate.", text: "One focused block.", img: runway, alt: "Aerial cockpit view of Runway 31 and intersecting Runway 18/36 at KLXL", cta: "Private pilot details", slug: "private-pilot" },
  { code: "03", label: "Instrument rating", time: "10–14 days", title: "Fly into the clouds.", text: "Fly by reference to instruments.", img: instrument, alt: "Cockpit glass displays while flying through cloud", cta: "Instrument details", slug: "instrument-rating" },
  { code: "04", label: "Commercial pilot", time: "5–7 days", title: "Fly professionally.", text: "Commercial standards in a focused block.", img: commercial, alt: "Lakes Area Aviation airplanes on the ramp at sunset", cta: "Commercial details", slug: "commercial-single-engine" },
  { code: "05", label: "CFI & CFII", time: "4–6 weeks", title: "Become the instructor.", text: "1-hour oral · 1-hour flight.", img: instructor, alt: "Flight instructor and student pilot in the cockpit at golden hour", cta: "CFI & CFII track", slug: "cfi-cfii" },
  { code: "06", label: "The right seat", time: "Your goal", title: "Build toward the airline flight deck.", text: "Every instructing hour moves you closer.", img: airline, alt: "Airline flight deck at night above city lights", cta: "Build my training plan", to: "/contact" },
];

export const airportStages: Stage[] = [
  { code: "MN", label: "Little Falls", hud: "KLXL · 13129 Airport Rd", time: "KLXL", title: "Little Falls, Minnesota.", text: "Little Falls/Morrison County Airport", img: lf, alt: "Public-domain USGS aerial photo of Little Falls/Morrison County Airport (KLXL) with both runways, hangars and surrounding fields", cta: "See our locations", to: "/locations", w: 1500, h: 1500, zoom: 0.4, zoomIn: 0.04 },
  { code: "CO", label: "Fort Lupton", hud: "18V · 7507 Co Rd 39", time: "18V", title: "Fort Lupton, Colorado.", text: "Platte Valley Airpark", img: fl, alt: "Public-domain USGS aerial photo of Platte Valley Airpark (18V) runway, hangars and surrounding Colorado farm fields", cta: "See our locations", to: "/locations", w: 1500, h: 1500, zoom: 0.12, zoomIn: 0.02 },
  { code: "AZ", label: "Cottonwood", hud: "P52 · 1001 W Mingus Ave", time: "P52", title: "Cottonwood, Arizona.", text: "Cottonwood Municipal Airport", img: cw, alt: "Public-domain USGS aerial photo of Cottonwood Municipal Airport (P52) runway 14/32, ramp and surrounding Verde Valley terrain", cta: "Build my training plan", to: "/contact", w: 1500, h: 1500, zoom: 0.18, zoomIn: 0.03 },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

type Props = { stages?: Stage[]; id?: string; label?: string; cue?: string; mode?: "alt" | "code" };

export function FlightJourney({ stages = journeyStages, id = "flight-path", label = "Your accelerated flight path", cue = "Scroll to climb", mode = "alt" }: Props = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
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
      const total = el.offsetHeight - window.innerHeight;
      const raw = clamp(-rect.top / total) * (n - 1);
      layerRefs.current.forEach((layer, i) => {
        if (!layer) return;
        const local = raw - i;
        const leaving = clamp(local);
        const coming = clamp(-local);
        const st = stages[i];
        const scale = reduce ? 1 : 1 + leaving * (st?.zoom ?? 0.55) + coming * (st?.zoomIn ?? 0.06);
        const opacity = local > 0 ? 1 - clamp(local * 1.4) : 1;
        const depth = reduce ? 0 : 10 + i * 3;
        layer.style.transform = `translate3d(${(mx * -depth).toFixed(2)}px, ${(my * -depth).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        layer.style.opacity = opacity.toFixed(3);
      });
      if (hudRef.current) hudRef.current.textContent = Math.round((raw / (n - 1)) * 35000).toLocaleString("en-US");
      if (barRef.current) barRef.current.style.transform = `scaleY(${raw / (n - 1)})`;
      const idx = Math.min(n - 1, Math.round(raw));
      if (idx !== last) { last = idx; setActive(idx); }
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; onScroll(); };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); window.removeEventListener("pointermove", onMove); };
  }, [stages]);

  const jump = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (total * i) / (stages.length - 1) + 2, behavior: "smooth" });
  };

  const s = stages[active]!;
  return (
    <section ref={sectionRef} id={id} aria-label={label} className="relative bg-ink text-background" style={{ height: `${stages.length * 110}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {stages.map((st, i) => (
          <div key={st.code} ref={(el) => { layerRefs.current[i] = el; }} className="absolute -inset-[2%] will-change-transform backface-hidden" style={{ zIndex: stages.length - i }}>
            <img src={st.img} alt={st.alt} width={1920} height={1088} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
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
          <div className="relative w-px bg-background/20"><div ref={barRef} className="absolute inset-0 origin-top bg-primary" style={{ transform: "scaleY(0)" }} /></div>
          <ol className="flex flex-col justify-between gap-6">
            {stages.map((st, i) => (
              <li key={st.code}>
                <button type="button" onClick={() => jump(i)} className={`group flex items-center gap-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${i === active ? "text-background" : "text-background/45 hover:text-background/80"}`}>
                  <span className={`size-2 rounded-full border border-current transition-all ${i === active ? "scale-150 bg-primary border-primary" : ""}`} />
                  <span className="hidden sm:inline">{st.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Copy */}
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto max-w-7xl px-5 pb-32 pr-16 md:pb-14 lg:px-8 lg:pb-20">
          <div key={s.code} className="journey-copy max-w-2xl">
            <p className="eyebrow text-primary">{s.code} · {s.label}</p>
            <p className="mt-4 font-display text-6xl leading-none sm:text-8xl">{s.time}</p>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{s.title}</h2>
            <p className="mt-3 max-w-lg text-background/75">{s.text}</p>
            {s.slug
              ? <Link to="/programs/$slug" params={{ slug: s.slug }} className="interactive-arrow btn-shine mt-6 inline-flex min-h-12 items-center gap-3 bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>
              : <Link to={s.to ?? "/contact"} className="interactive-arrow btn-shine mt-6 inline-flex min-h-12 items-center gap-3 bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">{s.cta} <ArrowRight className="size-4" /></Link>}
          </div>
        </div>
        {active === 0 && (
          <p className="pointer-events-none absolute left-1/2 top-[28%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-background/70 sm:top-1/2 sm:gap-4 sm:text-xs">
            <span className="mouse-cue relative block h-10 w-6 rounded-full border-2 border-background/70"><span className="mouse-wheel absolute inset-x-0 top-2 mx-auto h-2 w-0.5 rounded-full bg-primary" /></span>
            <span className="-mr-[0.3em]">{cue}</span>
          </p>
        )}
      </div>
    </section>
  );
}
