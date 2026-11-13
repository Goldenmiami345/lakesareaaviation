import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { srcSetFor } from "@/lib/responsive-image";
import { InquiryBand, SiteLayout } from "../components/site-shell";
import { findSpecialty, SPECIALTY_KIND_LABEL, specialtyCourses } from "../lib/site-data";
import { SPECIALTY_PHOTOS } from "../lib/specialty-photos";

export const Route = createFileRoute("/specialized-training_/$slug")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const course = findSpecialty(params.slug);
    if (!course) throw notFound();
    return course;
  },
  head: ({ loaderData: c }) => {
    const title = c ? `${c.name} | Lakes Area Aviation` : "Specialized Training | Lakes Area Aviation";
    const d = c ? `${c.name}: ${c.definition}` : "Endorsements and specialty courses at Lakes Area Aviation.";
    return { meta: [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...(c ? [] : [{ name: "robots", content: "noindex" }])] };
  },
  component: SpecialtyPage,
});

function SpecialtyPage() {
  const c = Route.useLoaderData();
  const photo = SPECIALTY_PHOTOS[c.slug];
  const facts = [...(c.location ? [{ k: "Location", v: c.location }] : []), ...c.facts, { k: "Estimate", v: "In your training plan" }];
  const related = specialtyCourses.filter((x) => x.slug !== c.slug && (x.kind === c.kind || (c.kind === "kodiak" && x.kind === "course")));
  return <SiteLayout>
    <section className="bg-ink pb-12 pt-28 text-background sm:pb-16 sm:pt-36">
      <div className="site-container grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div>
          <Link to="/specialized-training" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-widest text-background/70 hover:text-background"><ArrowLeft className="size-4" /> Specialized training</Link>
          <p className="stage-label mt-4">{SPECIALTY_KIND_LABEL[c.kind]}</p>
          <h1 className="mt-3 font-display text-4xl sm:text-6xl">{c.name}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-background/80 sm:text-lg">{c.definition}</p>
        </div>
        {photo && <div className="relative aspect-[4/3] overflow-hidden bg-background/5 lg:aspect-[3/2]"><img src={photo.src} srcSet={srcSetFor(photo.src)} sizes="(min-width: 1024px) 52vw, 100vw" alt={photo.alt} width={1280} height={853} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" /></div>}
      </div>
    </section>
    <section className="site-container relative z-10 -mt-6 sm:-mt-8">
      <div className="grid gap-px overflow-hidden border border-border bg-border shadow-2xl sm:grid-cols-2 lg:grid-flow-col lg:grid-cols-none lg:auto-cols-fr">
        {facts.map((f) => <div key={f.k} className="bg-background p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{f.k}</p><p className="mt-2 font-display text-2xl sm:text-3xl">{f.v}</p></div>)}
        <Link to="/contact" search={{ program: c.name }} className={`btn-shine flex min-h-16 items-center justify-between gap-3 bg-primary p-5 text-sm font-bold uppercase text-primary-foreground sm:p-6 lg:col-span-1 ${facts.length % 2 === 0 ? "sm:col-span-2" : ""}`}>Build my training plan <ArrowRight className="size-5" /></Link>
      </div>
    </section>
    <section className="site-container grid gap-12 py-14 lg:grid-cols-2 lg:py-20">
      <div>
        <p className="eyebrow text-primary-text">What you’ll train</p>
        <ul className="mt-5 border-y border-border">{c.train.map((t) => <li key={t} className="flex gap-4 border-b border-border py-4 last:border-0"><Check className="mt-0.5 size-5 shrink-0 text-primary-text" /><span className="font-semibold">{t}</span></li>)}</ul>
      </div>
      {related.length > 0 && <div>
        <p className="eyebrow text-primary-text">{c.kind === "endorsement" ? "More endorsements" : "More specialty courses"}</p>
        <div className="mt-5 border-t border-border">{related.map((r) => <Link key={r.slug} to="/specialized-training/$slug" params={{ slug: r.slug }} className="interactive-arrow flex min-h-14 items-center justify-between gap-4 border-b border-border py-3 hover:text-primary-text"><span className="font-display text-xl">{r.name}</span><ArrowRight className="size-4 shrink-0" /></Link>)}</div>
      </div>}
    </section>
    <InquiryBand />
  </SiteLayout>;
}
