import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { programs } from "../lib/site-data";

export function MotionExperience({ pageKey }: { pageKey: string }) {

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -8%" });
    // Anything already on screen is marked visible BEFORE hidden states are enabled, so it never flashes.
    revealTargets.forEach((target) => {
      const r = target.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) target.classList.add("is-visible", "reveal-instant");
      else observer.observe(target);
    });
    document.documentElement.classList.add("reveal-ready");

    // Scroll-linked variables are written on the elements that use them (never on <html>, which
    // restyled the whole page every frame), page height is cached, and unchanged values are skipped.
    let frame = 0, max = 0, lastProgress = "", lastShift = "";
    const bar = document.querySelector<HTMLElement>(".scroll-progress");
    const heroes = Array.from(document.querySelectorAll<HTMLElement>(".hero-parallax"));
    const measure = () => { max = document.documentElement.scrollHeight - window.innerHeight; };
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const progress = (max > 0 ? Math.min(1, y / max) : 0).toFixed(4);
        if (bar && progress !== lastProgress && !document.documentElement.classList.contains("story-mode")) { lastProgress = progress; bar.style.setProperty("--scroll-progress", progress); }
        const shift = `${Math.min(y * 0.16, 120).toFixed(1)}px`;
        if (shift !== lastShift) { lastShift = shift; heroes.forEach((h) => h.style.setProperty("--hero-shift", shift)); }
      });
    };
    measure();
    updateScroll();
    const ro = new ResizeObserver(() => { measure(); updateScroll(); });
    ro.observe(document.body);
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      observer.disconnect();
      ro.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
    };
  }, [pageKey]);

  return <div className="scroll-progress" aria-hidden="true" />;
}

export function TapScrollHint() {
  const [cycle, setCycle] = useState(0);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    let count = 0; let t: ReturnType<typeof setTimeout>;
    const next = () => { count += 1; setCycle(count); t = setTimeout(next, count < 3 ? 5000 : 10000); };
    t = setTimeout(next, 600);
    const onScroll = () => { if (window.scrollY > 40) setGone(true); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);
  if (gone || cycle === 0) return null;
  return <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[24%] z-20 -translate-x-1/2 sm:hidden">
    <span key={cycle} className="tap-scroll-dot block size-4 rounded-full bg-background/90" />
  </div>;
}

export function ScrollCue({ targetId }: { targetId: string }) {
  return (
    <>
    <TapScrollHint />
    <div className="absolute inset-x-0 bottom-5 z-20 hidden justify-center sm:flex">
      <button type="button" aria-label="Continue to the flight path" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })} className="landing-scroll-cue relative h-10 w-5 text-background/70 hover:text-background">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 overflow-hidden bg-background/25" aria-hidden="true">
          <span className="landing-scroll-stroke absolute inset-x-0 top-0 h-4 bg-primary" />
        </span>
      </button>
    </div>
    </>
  );
}

export function ProgramExplorer() {
  const [active, setActive] = useState(0);
  const program = programs[active];
  if (!program) return null;

  return <section className="bg-secondary py-20 sm:py-28" data-scroll-reveal>
    <div className="site-container">
      <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
        <div><p className="eyebrow text-primary-text">Interactive route finder</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">What are you training for next?</h2></div>
        <div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a training program">
            {programs.map((item, index) => <button key={item.slug} type="button" role="tab" aria-selected={index === active} onClick={() => setActive(index)} className={`program-chip min-h-11 border px-4 text-xs font-bold uppercase transition-[color,background-color,border-color,scale] ${index === active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary"}`}>{item.name}</button>)}
          </div>
          <div key={program.slug} className="program-detail mt-8 border-l-2 border-primary pl-6">
            <p className="eyebrow text-primary-text">{program.short}</p><h3 className="mt-3 font-display text-4xl">{program.name}</h3><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{program.description}</p>
            <Link to="/programs/$slug" params={{ slug: program.slug }} className="mt-7 inline-flex items-center gap-3 text-sm font-bold uppercase text-primary-text">View this training path <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
