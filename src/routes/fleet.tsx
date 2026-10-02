import { createFileRoute } from "@tanstack/react-router";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { fleet } from "../lib/site-data";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: m(
      "Training Fleet | Lakes Area Aviation",
      "Explore the actual Lakes Area Aviation aircraft used for primary, instrument, commercial, multi-engine, and tailwheel training."
    ),
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro
        eyebrow="Aircraft"
        title="The airplanes you’ll actually fly."
        text="Meet the Lakes Area Aviation fleet for primary, instrument, commercial, multi-engine, and specialized training — with the real specs and panels for each airplane."
      />
      <main className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="stagger-grid grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3" data-scroll-reveal>
          {fleet.map((f, i) => (
            <article key={f.registration} className="group bg-background">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={f.image}
                  alt={`${f.name} ${f.registration} “${f.nickname}”`}
                  width={1200}
                  height={900}
                  loading={i < 3 ? "eager" : "lazy"}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.035]"
                />
              </div>
              <div className="p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-primary">N° 0{i + 1}</span>
                  <span className="text-xs font-bold uppercase text-muted-foreground">{f.registration}</span>
                </div>
                <h2 className="mt-6 font-display text-3xl">{f.name}</h2>
                <p className="mt-1 font-display text-lg text-muted-foreground">“{f.nickname}”</p>
                <p className="mt-4 text-xs font-bold uppercase text-primary">{f.use}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.note}</p>
                {"specs" in f && f.specs && (
                  <dl className="mt-6 grid grid-cols-2 gap-px border border-border bg-border text-sm">
                    {Object.entries(f.specs).map(([k, v]) => (
                      <div key={k} className="bg-background px-3 py-2">
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{k}</dt>
                        <dd className="mt-0.5 font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {"panel" in f && f.panel && (
                  <figure className="mt-6">
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={f.panel}
                        alt={`${f.registration} instrument panel`}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {f.registration} panel
                    </figcaption>
                  </figure>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
      <InquiryBand />
    </SiteLayout>
  );
}

const m = (title: string, d: string) => [
  { title },
  { name: "description", content: d },
  { property: "og:title", content: title },
  { property: "og:description", content: d },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];
