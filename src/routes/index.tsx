import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Clock3, MapPin, Plane } from "lucide-react";
import heroImage from "../assets/lakes-hero.jpg";
import instructorImage from "../assets/instructor-student.jpg";
import { InquiryBand, SiteLayout } from "../components/site-shell";
import { programs, testimonials } from "../lib/site-data";

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
      <section className="relative min-h-[92svh] overflow-hidden bg-foreground text-background">
        <img src={heroImage} alt="Training aircraft on a runway at sunset" width={1920} height={1088} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[62%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/65 to-transparent" />
        <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col justify-end px-5 pb-16 pt-32 lg:px-8 lg:pb-20">
          <div className="max-w-3xl reveal"><p className="eyebrow text-primary">Accelerated pilot ratings</p><h1 className="mt-5 font-display text-5xl leading-[.94] sm:text-7xl lg:text-[5.8rem]">CFI and CFII in 4–6 weeks.</h1><p className="mt-5 font-display text-2xl text-background/90 sm:text-3xl">1 hour oral. 1 hour flight.</p><p className="mt-6 max-w-xl text-base leading-relaxed text-background/70 sm:text-lg">Focused training for pilots ready to move. Build your private, instrument, commercial, or instructor rating around a clear timeline.</p></div>
          <div className="mt-8 flex flex-wrap gap-3 reveal-delay"><Link to="/contact" className="inline-flex min-h-14 items-center gap-3 bg-primary px-6 text-sm font-bold uppercase text-primary-foreground">Build my training plan <ArrowRight className="size-4" /></Link><Link to="/accelerated-training" className="inline-flex min-h-14 items-center border border-background/40 px-6 text-sm font-bold uppercase text-background">Explore accelerated training</Link></div>
          <div className="mt-14 flex items-center gap-4 text-xs font-semibold uppercase text-background/60"><span className="h-px w-16 bg-primary runway-line" /><ArrowDown className="size-4" /> Scroll to plan your rating</div>
        </div>
      </section>

      <section className="border-b border-border bg-background py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow text-primary">Choose your next checkpoint</p><h2 className="mt-4 font-display text-4xl sm:text-6xl">Every rating.<br />One focused plan.</h2></div><p className="max-w-2xl self-end text-lg leading-relaxed text-muted-foreground">Accelerated doesn’t mean rushed. It means your aircraft, instructor, ground work, and milestones are organized before you arrive.</p></div><div className="mt-14 grid border-l border-t border-border md:grid-cols-2 xl:grid-cols-4">{programs.slice(0,4).map((p, i) => <Link key={p.slug} to="/programs/$slug" params={{slug:p.slug}} className="group min-h-64 border-b border-r border-border p-6 transition-colors hover:bg-secondary"><span className="text-xs font-bold text-primary">0{i+1}</span><h3 className="mt-12 font-display text-2xl">{p.name}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p><ArrowRight className="mt-6 size-5 transition-transform group-hover:translate-x-2" /></Link>)}</div><Link to="/programs" className="mt-8 inline-flex items-center gap-3 text-sm font-bold uppercase text-primary">See all training programs <ArrowRight className="size-4" /></Link></div></section>

      <section className="bg-foreground py-20 text-background sm:py-28"><div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8"><div className="relative min-h-[520px] overflow-hidden"><img src={instructorImage} alt="Instructor and student reviewing a flight checklist" width={1200} height={1504} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute bottom-0 left-0 bg-primary p-6 text-primary-foreground"><p className="eyebrow">On-site logistics</p><p className="mt-2 font-display text-3xl">Stay focused on training.</p></div></div><div className="flex flex-col justify-center"><p className="eyebrow text-primary">Designed for momentum</p><h2 className="mt-4 font-display text-5xl sm:text-6xl">Arrive ready.<br />Train every day.</h2><div className="mt-10 divide-y divide-background/15 border-y border-background/15"><Fact icon={<Clock3 />} title="Focused scheduling" text="Your training sequence is organized around proficiency, availability, weather, and checkride readiness." /><Fact icon={<MapPin />} title="Housing from $30/night" text="Affordable student housing helps visiting pilots stay close to training." /><Fact icon={<Plane />} title="Resident cars $20–30/day" text="Ground transportation is available so travel logistics don’t interrupt the plan." /></div></div></div></section>

      <section className="bg-secondary py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="eyebrow text-primary">Student experience</p><div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_.7fr]"><blockquote className="font-display text-3xl leading-snug sm:text-5xl">“{featuredStory.quote}”<footer className="mt-8 font-sans text-sm font-bold uppercase text-foreground">{featuredStory.name}<span className="block mt-1 font-normal normal-case text-muted-foreground">{featuredStory.detail}</span></footer></blockquote><div className="border-l border-border pl-8"><p className="text-sm leading-relaxed text-muted-foreground">Andrew’s timeline reflects his individual experience. Your plan depends on experience, preparation, weather, aircraft, and examiner availability.</p><Link to="/student-success" className="mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase text-primary">More student stories <ArrowRight className="size-4" /></Link></div></div></div></section>
      <InquiryBand />
    </main>
  </SiteLayout>;
}

function Fact({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="grid grid-cols-[auto_1fr] gap-5 py-6"><div className="text-primary [&>svg]:size-6">{icon}</div><div><h3 className="font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-background/60">{text}</p></div></div>; }