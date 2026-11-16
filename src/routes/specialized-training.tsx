import { createFileRoute, Link } from "@tanstack/react-router";
import { SlotText, } from "@/components/slot-text";
import { useSiteContent } from "../lib/use-site-content";
import { ArrowRight } from "lucide-react";
import { srcSetFor } from "@/lib/responsive-image";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { type SpecialtyCourse } from "../lib/site-data";
import { useCourses } from "../lib/use-catalog";
import { AddTile, HideToggle, hiddenAttr } from "../components/catalog-controls";

import { coursePhoto } from "../lib/course-photo";

type Course = SpecialtyCourse & { hidden?: boolean; photo?: string };

export const Route = createFileRoute("/specialized-training")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("Specialized Training & Endorsements | Lakes Area Aviation", "Kodiak 100 initial and recurrent training, tailwheel, complex, high-performance, high-altitude, spin, mountain, aerobatic, ski plane, and Cirrus transition training.") }),
  component: Page,
});

function Page() {
  const site = useSiteContent();
  const { all, courses: visible, editing } = useCourses();
  const list = editing ? all : visible;
  const kodiak = list.find((c) => c.kind === "kodiak");
  const endorsements = list.filter((c) => c.kind === "endorsement");
  const courses = list.filter((c) => c.kind === "course" || (c.kind === "kodiak" && c !== kodiak));
  const kPhoto = kodiak ? coursePhoto(site, kodiak) : undefined;
  return (
    <SiteLayout>
      <PageIntro k="specialized-training.intro" eyebrow="Specialized training" title="Endorsements and courses beyond the ratings." text="Along with our commitment to providing you the best training to fit your needs and schedule, we also offer specialized training in a variety of endorsements and ratings." />
      <div className="site-container space-y-14 py-14 sm:space-y-20 sm:py-20">
        {kodiak && <Link to="/specialized-training/$slug" params={{ slug: kodiak.slug }} className="interactive-arrow group grid min-h-56 overflow-hidden bg-ink text-background md:grid-cols-[1.1fr_1fr]" data-scroll-reveal>
          <div className="p-7 md:p-12">
            <p className="eyebrow text-primary-text"><SlotText k="specialized-training.text.1" d="Kodiak 100 training" /></p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl"><SlotText k="specialized-training.text.2" d="Approved initial & recurrent provider." /></h2>
            <div className="mt-7 grid max-w-sm grid-cols-2 gap-6">{kodiak.facts.map((f) => <div key={f.k}><p className="font-display text-4xl text-primary-text">{f.v.replace(" days", "")}</p><p className="text-xs uppercase text-background/70"><SlotText k="specialized-training.text.3" d="Days ·" /> {f.k.toLowerCase()}</p></div>)}</div>
            <span className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase"><SlotText k="specialized-training.text.4" d="Learn more" /> <ArrowRight className="size-4" /></span>
          </div>
          {kPhoto && <div className="relative min-h-56 overflow-hidden"><img data-slot-photo={`course.${kodiak.slug}.photo`} src={kPhoto.src} srcSet={srcSetFor(kPhoto.src)} sizes="(min-width: 768px) 45vw, 100vw" alt={kPhoto.alt} width={1280} height={853} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /></div>}
        </Link>}
        <section id="endorsements" className="scroll-mt-28" data-scroll-reveal>
          <p className="eyebrow text-primary-text"><SlotText k="specialized-training.text.5" d="Endorsements" /></p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{endorsements.map((c) => <CourseCard key={c.slug} c={c} />)}<AddTile kind="courses" /></div>
        </section>
        <section id="courses" className="scroll-mt-28" data-scroll-reveal>
          <p className="eyebrow text-primary-text"><SlotText k="specialized-training.text.6" d="Specialty courses" /></p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{courses.map((c) => <CourseCard key={c.slug} c={c} />)}<AddTile kind="courses" /></div>
        </section>
        <p className="text-sm text-muted-foreground"><SlotText k="specialized-training.text.7" d="Tap any course for details. Pricing and timeline estimates come with your plan." /> <Link to="/contact" className="font-bold text-primary-text"><SlotText k="specialized-training.text.8" d="Build my training plan →" /></Link></p>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}

function CourseCard({ c }: { c: Course }) {
  const site = useSiteContent();
  const photo = coursePhoto(site, c);
  return <Link to="/specialized-training/$slug" params={{ slug: c.slug }} {...hiddenAttr(!!c.hidden)} className="interactive-arrow group relative flex min-h-full flex-col overflow-hidden border border-border bg-background transition-colors hover:border-foreground">
    <div className="relative aspect-[4/3] overflow-hidden bg-secondary"><HideToggle kind="courses" id={c.slug} hidden={!!c.hidden} className="!absolute left-2 top-2 !min-h-8 !px-2 !text-[9px]" />{photo && <img data-slot-photo={`course.${c.slug}.photo`} src={photo.src} srcSet={srcSetFor(photo.src)} sizes="(min-width: 1024px) 20vw, 50vw" alt={photo.alt} width={800} height={600} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />}</div>
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      {c.location && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><SlotText k={`course.${c.slug}.location`} d={c.location!} /></p>}
      <h3 className="mt-1 font-display text-lg leading-tight sm:text-xl"><SlotText k={`course.${c.slug}.name`} d={c.name} /></h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground max-sm:line-clamp-2 sm:text-sm"><SlotText k={`course.${c.slug}.summary`} d={c.summary} /></p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-bold uppercase"><SlotText k="specialized-training.text.9" d="Details" /> <ArrowRight className="size-3.5" /></span>
    </div>
  </Link>;
}
const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
