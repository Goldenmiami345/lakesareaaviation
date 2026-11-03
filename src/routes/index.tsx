import { createFileRoute, Link } from "@tanstack/react-router";
import { srcSetFor } from "@/lib/responsive-image";
import { ArrowRight, ArrowUp, MapPin } from "lucide-react";
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
    { title: "Zero to Hero Flight Training | Lakes Area Aviation" },
    { name: "description", content: "From your first flight to commercial pilot and instructor. Explore Lakes Area Aviation’s accelerated zero-to-hero training path and build your personal plan." },
    { property: "og:title", content: "Zero to Hero Flight Training | Lakes Area Aviation" },
    { property: "og:description", content: "From your first flight to commercial pilot and instructor, build a training plan around your starting point." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HomePage,
});

function HomePage() {
  const featuredStory = testimonials[0];
  if (!featuredStory) return null;
  return <SiteLayout overlayHeader>
    <div>
      <section className="relative min-h-[100svh] overflow-hidden bg-ink text-background">
        <div className="hero-parallax absolute inset-0"><picture><source media="(max-aspect-ratio: 3/2)" srcSet={srcSetFor(heroTallImage.url)} sizes="100vw" width={1280} height={1189} /><img src={heroImage.url} srcSet={srcSetFor(heroImage.url)} sizes="100vw" decoding="async" alt="Lakes Area Aviation Cessna N6717A and Piper Apache on the ramp at sunset" width={1584} height={672} fetchPriority="high" className="hero-kenburns h-[112%] w-full object-cover object-[35%_center]" /></picture></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/5 lg:bg-gradient-to-r lg:from-ink lg:via-ink/60 lg:to-transparent" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('hero-enter','first-view')" }} />
        <div className="site-container relative flex min-h-[100svh] flex-col justify-end pb-7 pt-24 sm:pb-[4.5rem] sm:pt-32">
          <div className="max-w-3xl lg:max-w-[66vw]">
            <p className="stage-label hero-step sm:text-[clamp(0.75rem,0.42rem+0.5vw,1.05rem)]" style={{ ["--d" as string]: "0ms" }}>Accelerated flight training</p>
            <h1 className="mt-2.5 font-display text-[2.1rem] leading-[1.02] sm:mt-3 sm:text-[clamp(2.65rem,1.1rem+4.4vw,7.25rem)]"><span className="line-mask hero-mask"><span style={{ ["--d" as string]: "90ms" }}>BECOME A <br className="sm:hidden" /><span className="whitespace-nowrap">PROFESSIONAL PILOT</span></span></span></h1>
          </div>
          <HeroCta />
          <nav aria-label="Training locations" className="hero-step mt-4 flex flex-wrap items-center gap-1 text-xs sm:text-[clamp(0.75rem,0.42rem+0.5vw,1.05rem)] lg:mt-6 font-bold uppercase tracking-[0.06em] text-background/75 sm:gap-2 sm:tracking-[0.14em]" style={{ ["--d" as string]: "360ms" }}>
            <MapPin aria-hidden className="mr-0.5 size-3.5 sm:size-[1.2em] shrink-0 text-background/55" />
            {airportStages.map((a, i) => <button key={a.code} type="button" onClick={() => jumpToJourney("airports", i)} className="shrink-0 whitespace-nowrap rounded-full border border-background/25 px-2 py-1.5 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground sm:px-[1em] sm:py-[0.6em]">{a.label}, {a.code}</button>)}
          </nav>
          <ScrollCue targetId="flight-path" />
        </div>
      </section>

      <FlightJourney />
      <FlightJourney stages={airportStages} id="airports" label="Three airports to train from" mode="code" fadeBottom="background" />

      <section className="bg-background py-20 sm:py-28" data-scroll-reveal>
        <div className="site-container">
          <div className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div><p className="eyebrow text-primary-text">More ways to train</p><h2 className="mt-4 max-w-[12ch] font-display text-4xl sm:text-6xl">Add the privilege. Sharpen the skill.</h2></div>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">Build beyond the core ratings with focused multi-engine training, instructor privileges, endorsements, and recurrent proficiency work.</p>
          </div>
          <div className="stagger-grid grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3" data-scroll-reveal>
            <ServiceLink eyebrow="3–4 days" title="Commercial multi" text="Add commercial multi-engine privileges in the Piper Apache." to="/programs/$slug" slug="commercial-multi-engine" />
            <ServiceLink eyebrow="3–4 days" title="MEI" text="Add multi-engine instructor privileges through a concentrated course." to="/programs/$slug" slug="mei" />
            <ServiceLink eyebrow="Approved provider" title="Kodiak 100" text="Insurance-approved initial and recurrent Kodiak 100 training." to="/specialized-training" />
            <ServiceLink eyebrow="Endorsements" title="Expand your envelope" text="Tailwheel, complex, high-performance, high-altitude, and spin training." to="/specialized-training" />
            <ServiceLink eyebrow="Specialty courses" title="Fly something new" text="Mountain flying, light aerobatics, ski plane, and Cirrus transition." to="/specialized-training" />
            <ServiceLink eyebrow="Stay proficient" title="Flight reviews" text="Continue training with instruction tailored to your experience and goals." to="/local-training" />
          </div>
          <p className="mt-px bg-background p-6 text-sm leading-relaxed text-muted-foreground lg:p-7">First time in the air? <Link to="/introductory-flights" className="font-bold text-primary-text">Introductory flights from $100</Link> — or <Link to="/scenic-flights" className="font-bold text-primary-text">book a scenic flight</Link> for up to three passengers.</p>
        </div>
      </section>

      <section className="edge-fade-b bg-ink pb-32 pt-20 text-background sm:pb-40 sm:pt-28"><div className="site-container grid gap-10 lg:grid-cols-2" data-scroll-reveal><div className="photo-reveal zoom-reveal relative min-h-[380px] overflow-hidden sm:min-h-[520px]" data-scroll-reveal><img src={trainingImage} alt="Lakes Area Aviation Piper Apache N4383P on the ramp" width={1600} height={1200} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" /></div><div className="flex flex-col justify-center"><p className="stage-label">Stay on site</p><h2 className="mt-4 font-display text-5xl sm:text-6xl">Arrive ready.<br />Train every day.</h2><div className="mt-10 grid grid-cols-2 gap-px bg-background/15"><Stat value="$30" label="Housing / night" /><Stat value="$20" label="Car / day" /></div></div></div></section>

      <section className="bg-secondary py-20 sm:py-28"><div className="mx-auto max-w-5xl px-5 lg:px-8" data-scroll-reveal="blur"><p className="eyebrow text-primary-text">Student experience</p><blockquote className="mt-6 font-display text-3xl leading-snug sm:text-5xl">“{featuredStory.quote}”<footer className="mt-8 font-sans text-sm font-bold uppercase text-foreground">{featuredStory.name}</footer></blockquote><Link to="/student-success" className="interactive-arrow mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase text-primary-text">More stories <ArrowRight className="size-4" /></Link><p className="mt-6 text-xs text-muted-foreground">Individual results vary.</p></div></section>
      <InquiryBand />
    </div>
    <BackToTop />
  </SiteLayout>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="bg-ink p-6"><p className="font-display text-4xl text-primary-text">{value}</p><p className="mt-2 text-xs font-bold uppercase tracking-widest text-background/60">{label}</p></div>; }

function ServiceLink({ eyebrow, title, text, to, slug }: { eyebrow: string; title: string; text: string; to: "/programs/$slug" | "/specialized-training" | "/local-training"; slug?: string }) {
  const content = <><p className="eyebrow text-primary-text">{eyebrow}</p><h3 className="mt-5 font-display text-3xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p><span className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase text-primary-text">Explore <ArrowRight className="size-4" /></span></>;
  return slug
    ? <Link to={to} params={{ slug }} className="program-card interactive-arrow group min-h-72 bg-background p-7 sm:p-8">{content}</Link>
    : <Link to={to} className="program-card interactive-arrow group min-h-72 bg-background p-7 sm:p-8">{content}</Link>;
}

function BackToTop() {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Hidden whenever the inquiry band/footer is on screen or any interactive control sits under it.
    const onScroll = () => {
      let ok = window.scrollY > window.innerHeight * 1.5;
      if (ok) ok = ![...document.querySelectorAll("[data-no-float]")].some((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; });
      const btn = ref.current;
      if (ok && btn) {
        const r = btn.getBoundingClientRect();
        const pts: [number, number][] = [[r.left - 6, r.top - 6], [r.right + 6, r.top - 6], [r.left - 6, r.bottom + 6], [r.right + 6, r.bottom + 6], [r.left + r.width / 2, r.top + r.height / 2]];
        ok = !pts.some(([x, y]) => document.elementsFromPoint(x, y).some((el) => el !== btn && !btn.contains(el) && !!el.closest("a,button,input,select,textarea,[role=button]") && !el.closest("[aria-hidden=true]")));
      }
      setShow(ok);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return <button ref={ref} type="button" aria-label="Back to top" tabIndex={show ? 0 : -1} onClick={() => glideTo(0)} className={`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-11 place-items-center rounded-full border border-background/25 bg-ink/80 text-background shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-primary md:bottom-6 md:right-6 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}><ArrowUp className="size-4" /></button>;
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
  return <div className="hero-step mt-5 lg:mt-7" style={{ ["--d" as string]: "270ms" }}><Link ref={ref} to="/contact" className="interactive-arrow group inline-flex min-h-12 items-center gap-4 border-b border-background/45 pb-1 text-sm sm:text-[clamp(0.875rem,0.5rem+0.6vw,1.3rem)] font-bold uppercase text-background transition-colors hover:border-primary">Build my training plan <span className="cta-orb grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="cta-arrow size-4" /></span></Link></div>;
}
