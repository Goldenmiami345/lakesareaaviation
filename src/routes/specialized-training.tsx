import { createFileRoute, Link } from "@tanstack/react-router";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";

const endorsements = ["Tailwheel", "Complex", "High Performance", "High Altitude", "Spin Training"];
const courses = [
  ["Mountain Flying Course", "Platte Valley location"],
  ["Light Aerobatics Course", "Little Falls location"],
  ["Ski Plane Training", "Little Falls location"],
  ["Cirrus Transition Training", "Little Falls location"],
];

export const Route = createFileRoute("/specialized-training")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("Specialized Training & Endorsements | Lakes Area Aviation", "Kodiak 100 initial and recurrent training, tailwheel, complex, high-performance, high-altitude, spin, mountain, aerobatic, ski plane, and Cirrus transition training.") }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro eyebrow="Specialized training" title="Endorsements and courses beyond the ratings." text="Along with our commitment to providing you the best training to fit your needs and schedule, we also offer specialized training in a variety of endorsements and ratings." />
      <main className="mx-auto max-w-7xl space-y-16 px-5 py-16 sm:py-20 lg:px-8">
        <section className="grid gap-8 bg-ink p-8 text-background md:grid-cols-[1fr_auto] md:items-end md:p-12" data-scroll-reveal>
          <div>
            <p className="eyebrow text-primary">Kodiak 100 training</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl">Approved initial & recurrent provider.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-background/75">We are an approved initial and recurrent training provider with most insurance companies for the Kodiak 100. Contact us for more details.</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div><p className="font-display text-4xl text-primary">3–4</p><p className="text-xs uppercase text-background/70">Days · initial</p></div>
            <div><p className="font-display text-4xl text-primary">1–2</p><p className="text-xs uppercase text-background/70">Days · recurrent</p></div>
          </div>
        </section>
        <div className="grid gap-12 lg:grid-cols-2">
          <section data-scroll-reveal>
            <p className="eyebrow text-primary">Endorsements</p>
            <div className="mt-4 flex flex-wrap gap-3">{endorsements.map((e) => <span key={e} className="border border-border px-4 py-3 font-display text-lg">{e}</span>)}</div>
          </section>
          <section data-scroll-reveal>
            <p className="eyebrow text-primary">Specialized courses</p>
            <div className="mt-4 border-y border-border">{courses.map(([c, l]) => <div key={c} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-0"><span className="min-w-0 font-display text-lg">{c}</span><span className="shrink-0 text-xs uppercase text-muted-foreground">{l}</span></div>)}</div>
          </section>
        </div>
        <p className="text-sm text-muted-foreground">Contact us for more details on pricing and timeline estimates. <Link to="/contact" className="font-bold text-primary">Ask about specialized training →</Link></p>
      </main>
      <InquiryBand />
    </SiteLayout>
  );
}
const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
