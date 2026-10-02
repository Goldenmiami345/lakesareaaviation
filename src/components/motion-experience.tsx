import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { programs } from "../lib/site-data";

export function MotionExperience() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -8%" });
    revealTargets.forEach((target) => observer.observe(target));

    let frame = 0;
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        document.documentElement.style.setProperty("--scroll-progress", String(progress));
        document.documentElement.style.setProperty("--hero-shift", `${Math.min(window.scrollY * 0.16, 120)}px`);
      });
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden="true" />;
}

export function ScrollCue({ targetId }: { targetId: string }) {
  return (
    <div className="mt-8 flex justify-center sm:mt-14">
      <button type="button" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })} className="scroll-cue flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-background/55 transition-colors hover:text-background sm:flex-col sm:gap-4 sm:text-xs sm:tracking-[0.3em]">
        <span className="mouse-cue relative block h-8 w-5 rounded-full border border-background/70 sm:h-10 sm:w-6 sm:border-2"><span className="mouse-wheel absolute inset-x-0 top-2 mx-auto h-1.5 w-0.5 rounded-full bg-primary sm:h-2" /></span>
        <span className="-mr-[0.22em] sm:-mr-[0.3em]">Scroll to plan your rating</span>
      </button>
    </div>
  );
}

export function ProgramExplorer() {
  const [active, setActive] = useState(0);
  const program = programs[active];
  if (!program) return null;

  return <section className="bg-secondary py-20 sm:py-28" data-scroll-reveal>
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
        <div><p className="eyebrow text-primary">Interactive route finder</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">What are you training for next?</h2></div>
        <div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a training program">
            {programs.map((item, index) => <button key={item.slug} type="button" role="tab" aria-selected={index === active} onClick={() => setActive(index)} className={`program-chip min-h-11 border px-4 text-xs font-bold uppercase transition-all ${index === active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary"}`}>{item.name}</button>)}
          </div>
          <div key={program.slug} className="program-detail mt-8 border-l-2 border-primary pl-6">
            <p className="eyebrow text-primary">{program.short}</p><h3 className="mt-3 font-display text-4xl">{program.name}</h3><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{program.description}</p>
            <Link to="/programs/$slug" params={{ slug: program.slug }} className="mt-7 inline-flex items-center gap-3 text-sm font-bold uppercase text-primary">View this training path <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
