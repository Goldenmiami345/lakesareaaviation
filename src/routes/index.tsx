import { createFileRoute, Link } from "@tanstack/react-router";
import { srcSetFor } from "@/lib/responsive-image";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import heroImage from "../assets/photos/sunset-ramp-crisp.webp.asset.json";
import heroTallImage from "../assets/photos/sunset-ramp-tall.webp.asset.json";
import apachePhoto from "../assets/fleet/walkaround/n4383p-03-1600.webp.asset.json";
const trainingImage = apachePhoto.url;
import { InquiryBand, SiteLayout } from "../components/site-shell";
import { testimonials } from "../lib/site-data";
import { ScrollCue } from "../components/motion-experience";
import { FlightJourney, airportStages, glideTo, jumpToJourney } from "../components/flight-journey";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({ links: [
    { rel: "preload", as: "image", href: heroTallImage.url, imageSrcSet: srcSetFor(heroTallImage.url), imageSizes: "100vw", media: "(max-aspect-ratio: 3/2)", fetchpriority: "high" },
    { rel: "preload", as: "image", href: heroImage.url, imageSrcSet: srcSetFor(heroImage.url), imageSizes: "100vw", media: "(min-aspect-ratio: 3/2)", fetchpriority: "high" },
  ], meta: [
    { title: "Take Flight | Zero to CFI in Six Months. Under $50K | Lakes Area Aviation" },
    { name: "description", content: "Become a professional pilot. Zero to CFI in six months. Under $50K. Build your training plan with Lakes Area Aviation." },
    { property: "og:title", content: "Take Flight | Zero to CFI in Six Months. Under $50K" },
    { property: "og:description", content: "Become a professional pilot with Lakes Area Aviation. Zero to CFI in six months. Under $50K." },
    { name: "twitter:title", content: "Take Flight | Zero to CFI in Six Months. Under $50K" },
    { name: "twitter:description", content: "Become a professional pilot with Lakes Area Aviation. Zero to CFI in six months. Under $50K." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HomePage,
});

function HomePage() {
  const featuredStory = testimonials[0];
  if (!featuredStory) return null;
  return <SiteLayout overlayHeader>
    <div>
      <div className="relative">
      <div aria-hidden className="story-snap h-px -mb-px" />
      <section className="sticky top-0 z-0 min-h-[100lvh] overflow-hidden bg-ink text-background">
        <div className="hero-parallax absolute inset-0"><picture className="absolute inset-0 block"><source media="(max-aspect-ratio: 3/2)" srcSet={srcSetFor(heroTallImage.url)} sizes="100vw" /><img src={heroImage.url} srcSet={srcSetFor(heroImage.url)} sizes="100vw" decoding="sync" alt="Lakes Area Aviation Cessna N6717A and Piper Apache on the ramp at sunset" width={1584} height={672} fetchPriority="high" className="hero-kenburns h-[112%] w-full object-cover object-[35%_center]" /></picture></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/5 lg:bg-gradient-to-r lg:from-ink lg:via-ink/60 lg:to-transparent" />
        <script dangerouslySetInnerHTML={{ __html: "var d=document.documentElement,u=navigator.userAgent;d.classList.add('hero-enter','first-view');if(/iPhone|iPod/.test(u)&&/Version\\/(2[6-9]|[3-9]\\d)/.test(u)&&!/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(u))d.classList.add('ios-glass')" }} />
        <div className="hero-content relative flex min-h-[100svh] w-full px-[var(--gutter)] flex-col justify-end pb-3 pt-24 sm:pb-[4.5rem] sm:pt-32">
          <div className="max-w-4xl lg:max-w-[76vw]">
            <h1 className="font-display text-[min(3.45rem,calc(74.75vw/16.6))] leading-[1.02] whitespace-nowrap"><span className="line-mask hero-mask"><span style={{ ["--d" as string]: "60ms" }}><span>BECOME A PROFESSIONAL PILOT</span></span></span></h1>
            <p className="hero-step mt-2 text-xs leading-relaxed text-background/80 sm:text-sm" style={{ ["--d" as string]: "180ms" }}>Zero to CFI in six months. <span className="whitespace-nowrap font-semibold text-background">Under $50K</span></p>
          </div>
          <HeroCta />
          <nav aria-label="Training locations" className="hero-step mt-2.5 flex flex-nowrap items-center gap-1 text-[10px] max-[360px]:gap-0.5 max-[360px]:text-[9px] sm:text-[11px] lg:mt-3.5 font-medium uppercase text-background/75 sm:gap-2" style={{ ["--d" as string]: "360ms" }}>
            <MapPin aria-hidden className="size-3 shrink-0 text-background/55" />
            {airportStages.map((a, i) => <button key={a.code} type="button" onClick={() => jumpToJourney("airports", i)} aria-label={`${a.label}, ${a.code}`} className="group/chip inline-flex min-h-11 uppercase shrink-0 items-center whitespace-nowrap"><span className="rounded-full border border-background/25 px-1 py-1 transition-colors max-[360px]:px-0.5 group-hover/chip:border-primary group-hover/chip:bg-primary group-hover/chip:text-primary-foreground sm:px-2">{a.label}<span className="sm:inline">, {a.code}</span></span></button>)}
          </nav>
          <ScrollCue targetId="flight-path" />
        </div>
      </section>
      <div aria-hidden className="hero-glass-skirt hidden bg-ink" />

      <div className="relative z-10">
        <div aria-hidden className="story-snap h-px -mb-px" />
        <FlightJourney />
        <div className="relative z-20"><div aria-hidden className="story-snap h-px -mb-px" /><FlightJourney stages={airportStages} id="airports" label="Three airports to train from" mode="code" fadeBottom="background" /></div>
      </div>
      </div>
      <div aria-hidden className="story-snap h-px -mb-px" />

      <section className="bg-background py-20 sm:py-28" data-scroll-reveal>
        <div className="site-container">
          <div className="stagger-grid grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3" data-scroll-reveal>
            <ServiceLink title="Multi-Engine Training" text="Earn your commercial multi, then add your MEI and learn to teach in the Piper Apache. About 3–4 days each." dest={{ to: "/programs/$slug", slug: "commercial-multi-engine" }} />
            <ServiceLink title="Endorsements" text="Tailwheel, complex, high-performance, high-altitude, and spin training." dest={{ to: "/specialized-training", hash: "endorsements" }} />
            <ServiceLink title="Advanced Kodiak 100 Training" text="Insurance-approved initial and recurrent Kodiak 100 training." dest={{ to: "/specialized-training/$slug", slug: "kodiak-100" }} />
            <ServiceLink title="Specialty Courses" text="Mountain flying, light aerobatics, ski plane, and Cirrus transition." dest={{ to: "/specialized-training", hash: "courses" }} />
            <ServiceLink title="Flight Reviews" text="Stay proficient with instruction tailored to your experience and goals." dest={{ to: "/local-training" }} />
            <ServiceLink title="Accelerated Courses" text="Every course in one list: ratings, endorsements, Kodiak 100, flight reviews and more." dest={{ to: "/accelerated-training", hash: "all-courses" }} />
          </div>
          <p className="mt-px bg-background p-6 text-sm leading-relaxed text-muted-foreground lg:p-7">First time in the air? <Link to="/introductory-flights" className="font-bold text-primary-text">Introductory flights from $100</Link>. Or <Link to="/scenic-flights" className="font-bold text-primary-text">book a scenic flight</Link> for up to three passengers.</p>
        </div>
      </section>

      <section className="edge-fade-b bg-ink pb-32 pt-20 text-background sm:pb-40 sm:pt-28"><div className="site-container grid gap-10 lg:grid-cols-2" data-scroll-reveal><div className="photo-reveal zoom-reveal relative min-h-[380px] overflow-hidden sm:min-h-[520px]" data-scroll-reveal><img src={trainingImage} alt="Lakes Area Aviation Piper Apache N4383P on the ramp" width={1600} height={1200} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" /></div><div className="flex flex-col justify-center"><p className="stage-label">Stay on site</p><h2 className="mt-4 font-display text-5xl sm:text-6xl">Arrive ready.<br />Train every day.</h2><div className="mt-10 grid grid-cols-2 gap-px bg-background/15"><Stat value="$30" label="Housing / night" /><Stat value="$20" label="Car / day" /></div></div></div></section>

      <section className="bg-secondary py-20 sm:py-28"><div className="mx-auto max-w-5xl px-5 lg:px-8" data-scroll-reveal="blur"><p className="eyebrow text-primary-text">Student experience</p><blockquote className="mt-6 font-display text-3xl leading-snug sm:text-5xl">“{featuredStory.quote}”<footer className="mt-8 font-sans text-sm font-bold uppercase text-foreground">{featuredStory.name}</footer></blockquote><Link to="/student-success" className="interactive-arrow mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase text-primary-text">More stories <ArrowRight className="size-4" /></Link><p className="mt-6 text-xs text-muted-foreground">Individual results vary.</p></div></section>
      <InquiryBand />
    </div>
  </SiteLayout>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="bg-ink p-6"><p className="font-display text-4xl text-primary-text">{value}</p><p className="mt-2 text-xs font-bold uppercase tracking-widest text-background/60">{label}</p></div>; }

type ServiceDest =
  | { to: "/programs/$slug" | "/specialized-training/$slug"; slug: string }
  | { to: "/specialized-training" | "/accelerated-training"; hash: string }
  | { to: "/local-training" };
function ServiceLink({ title, text, dest }: { title: string; text: string; dest: ServiceDest }) {
  const content = <><h3 className="font-display text-[1.75rem] leading-tight sm:text-3xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase text-foreground sm:mt-8">Explore <ArrowRight className="size-4" /></span></>;
  const cls = "program-card interactive-arrow group bg-background p-6 sm:min-h-64 sm:p-8";
  if ("slug" in dest) return dest.to === "/programs/$slug"
    ? <Link to="/programs/$slug" params={{ slug: dest.slug }} className={cls}>{content}</Link>
    : <Link to="/specialized-training/$slug" params={{ slug: dest.slug }} className={cls}>{content}</Link>;
  if ("hash" in dest) return <Link to={dest.to} hash={dest.hash} className={cls}>{content}</Link>;
  return <Link to={dest.to} className={cls}>{content}</Link>;
}

function HeroCta() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // Entrance ran once; drop the class so returning to the page never replays it.
    const done = window.setTimeout(() => document.documentElement.classList.remove("hero-enter"), 1300);
    const el = ref.current;
    const leave = () => { window.clearTimeout(done); document.documentElement.classList.remove("first-view"); };
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return leave;
    let visible = false, held = false;
    const hold = () => { held = true; el.classList.remove("cta-nudge"); }, release = () => { held = el.matches(":hover") || el.matches(":focus-visible") || el === document.activeElement; };
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (!visible) el.classList.remove("cta-nudge"); }, { threshold: 0.5 });
    io.observe(el);
    const timer = window.setInterval(() => {
      if (!visible || held || document.hidden) return;
      el.classList.remove("cta-nudge"); void el.offsetWidth; el.classList.add("cta-nudge");
    }, 7000);
    const end = () => el.classList.remove("cta-nudge");
    el.addEventListener("pointerenter", hold); el.addEventListener("focus", hold);
    el.addEventListener("pointerleave", () => { held = false; release(); }); el.addEventListener("blur", () => { held = false; });
    el.addEventListener("animationend", end);
    return () => { leave(); window.clearInterval(timer); io.disconnect(); };
  }, []);
  return <div className="hero-step mt-1" style={{ ["--d" as string]: "270ms" }}><Link ref={ref} to="/contact" className="interactive-arrow group inline-flex min-h-12 items-center gap-4 border-b border-background/45 pb-1 text-sm sm:text-[clamp(0.875rem,0.5rem+0.6vw,1.3rem)] font-bold uppercase text-background transition-colors hover:border-primary">Build my training plan <span className="cta-orb grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="cta-arrow size-4" /></span></Link></div>;
}
