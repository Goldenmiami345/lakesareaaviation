import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import heroImage from "../assets/photos/sunset-ramp.webp";
import trainingImage from "../assets/fleet/n3353p-enhanced.webp";
import { InquiryBand, SiteLayout } from "../components/site-shell";
import { testimonials } from "../lib/site-data";
import { ScrollCue } from "../components/motion-experience";
import { FlightJourney, airportStages } from "../components/flight-journey";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Accelerated Flight Training | Lakes Area Aviation" },
    { name: "description", content: "Accelerated CFI, CFII, commercial, instrument, and private pilot training built around your timeline." },
    { property: "og:title", content: "Accelerated Flight Training | Lakes Area Aviation" },
    { property: "og:description", content: "Move through your next pilot rating on a focused schedule." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HomePage,
});

function HomePage() {
  const featuredStory = testimonials[0];
  if (!featuredStory) return null;
  return <SiteLayout overlayHeader>
    <main>
      <section className="relative min-h-[100svh] overflow-hidden bg-ink text-background">
        <div className="hero-parallax absolute inset-0"><img src={heroImage} alt="Lakes Area Aviation Cessna N6717A and Piper Apache on the ramp at sunset" width={1600} height={900} fetchPriority="high" className="hero-kenburns h-[112%] w-full object-cover object-[35%_center]" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/5 lg:bg-gradient-to-r lg:from-ink lg:via-ink/60 lg:to-transparent" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-9 pt-24 sm:pb-20 sm:pt-32 lg:px-8">
          <div className="max-w-3xl reveal">
            <p className="eyebrow photo-label">Accelerated CFI &amp; CFII</p>
            <h1 className="mt-4 max-w-[9ch] font-display text-5xl leading-[.94] sm:mt-5 sm:max-w-none sm:text-7xl lg:text-[5.8rem]"><span className="line-mask"><span>CFI &amp; CFII</span></span><span className="line-mask delay-1"><span>in 4–6 weeks.</span></span></h1>
            <div className="mt-6 flex items-center gap-4 sm:mt-7" aria-label="CFI and CFII exam: one-hour oral and one-hour flight">
              <span className="h-px w-7 bg-primary" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase text-background/65">CFI &amp; CFII exam</p>
                <p className="mt-1 flex items-baseline gap-3 text-background">
                  <span><strong className="font-display text-2xl font-normal text-primary sm:text-3xl">1</strong> <span className="text-xs font-bold uppercase">hour oral</span></span>
                  <span className="h-4 w-px bg-background/30" aria-hidden="true" />
                  <span><strong className="font-display text-2xl font-normal text-primary sm:text-3xl">1</strong> <span className="text-xs font-bold uppercase">hour flight</span></span>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-7 reveal-delay"><Link to="/contact" className="interactive-arrow group inline-flex min-h-12 items-center gap-4 border-b border-background/45 pb-1 text-sm font-bold uppercase text-background transition-colors hover:border-primary">Build my training plan <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-4" /></span></Link></div>
          <ScrollCue targetId="flight-path" />
        </div>
      </section>

      <FlightJourney />
      <FlightJourney stages={airportStages} id="airports" label="Three airports to train from" mode="code" />

      <section className="bg-background py-20 sm:py-28" data-scroll-reveal>
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div><p className="eyebrow text-primary">More ways to train</p><h2 className="mt-4 max-w-[12ch] font-display text-4xl sm:text-6xl">Add the privilege. Sharpen the skill.</h2></div>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">Build beyond the core ratings with focused multi-engine training, instructor privileges, endorsements, and recurrent proficiency work.</p>
          </div>
          <div className="stagger-grid grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4" data-scroll-reveal>
            <ServiceLink eyebrow="3–4 days" title="Commercial multi" text="Add commercial multi-engine privileges in the Piper Apache." to="/programs/$slug" slug="commercial-multi-engine" />
            <ServiceLink eyebrow="3–4 days" title="MEI" text="Add multi-engine instructor privileges through a concentrated course." to="/programs/$slug" slug="mei" />
            <ServiceLink eyebrow="Endorsements" title="Expand your envelope" text="Tailwheel, complex, high-performance, high-altitude, and spin training." to="/specialized-training" />
            <ServiceLink eyebrow="Stay proficient" title="Flight reviews" text="Continue training with instruction tailored to your experience and goals." to="/local-training" />
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-background sm:py-28"><div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:px-8" data-scroll-reveal><div className="photo-reveal zoom-reveal relative min-h-[380px] overflow-hidden sm:min-h-[520px]" data-scroll-reveal><img src={trainingImage} alt="Lakes Area Aviation Piper Apache N3353P on the ramp" width={1600} height={1200} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.04]" /></div><div className="flex flex-col justify-center"><p className="eyebrow photo-label">Stay on site</p><h2 className="mt-4 font-display text-5xl sm:text-6xl">Arrive ready.<br />Train every day.</h2><div className="mt-10 grid grid-cols-2 gap-px bg-background/15"><Stat value="$30" label="Housing / night" /><Stat value="$20" label="Car / day" /></div></div></div></section>

      <section className="bg-secondary py-20 sm:py-28"><div className="mx-auto max-w-5xl px-5 lg:px-8" data-scroll-reveal="blur"><p className="eyebrow text-primary">Student experience</p><blockquote className="mt-6 font-display text-3xl leading-snug sm:text-5xl">“{featuredStory.quote}”<footer className="mt-8 font-sans text-sm font-bold uppercase text-foreground">{featuredStory.name}</footer></blockquote><Link to="/student-success" className="interactive-arrow mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase text-primary">More stories <ArrowRight className="size-4" /></Link><p className="mt-6 text-xs text-muted-foreground">Individual results vary.</p></div></section>
      <InquiryBand />
    </main>
  </SiteLayout>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="bg-ink p-6"><p className="font-display text-4xl text-primary">{value}</p><p className="mt-2 text-xs font-bold uppercase tracking-widest text-background/60">{label}</p></div>; }

function ServiceLink({ eyebrow, title, text, to, slug }: { eyebrow: string; title: string; text: string; to: "/programs/$slug" | "/specialized-training" | "/local-training"; slug?: string }) {
  const content = <><p className="eyebrow text-primary">{eyebrow}</p><h3 className="mt-5 font-display text-3xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p><span className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase text-primary">Explore <ArrowRight className="size-4" /></span></>;
  return slug
    ? <Link to={to} params={{ slug }} className="program-card interactive-arrow group min-h-72 bg-background p-7 sm:p-8">{content}</Link>
    : <Link to={to} className="program-card interactive-arrow group min-h-72 bg-background p-7 sm:p-8">{content}</Link>;
}
