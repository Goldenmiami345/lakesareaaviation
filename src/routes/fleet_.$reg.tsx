import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize, Phone } from "lucide-react";
import { srcSetFor } from "@/lib/responsive-image";
import { InquiryBand, SiteLayout } from "../components/site-shell";
import { fleet, RATE_NOTES, SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";
import { ENDORSEMENTS, findPlane, planeSlug, planeTitle, ROLE_LABEL, TRAINING } from "../lib/fleet-info";

// Photos only, like the fleet list: this page never loads 3D models.
const AircraftViewer = lazy(() => import("../components/aircraft-viewer"));

export const Route = createFileRoute("/fleet_/$reg")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const plane = findPlane(params.reg);
    if (!plane) throw notFound();
    return plane;
  },
  head: ({ loaderData: p }) => {
    const title = p ? `${planeTitle(p)}, ${p.name} | Lakes Area Aviation Fleet` : "Aircraft | Lakes Area Aviation";
    const d = p ? `${p.name} ${p.registration}${p.nickname ? ` “${p.nickname}”` : ""}: ${p.use.replaceAll(" · ", ", ")}.${p.rate ? ` ${p.rate} wet${p.prepay ? `, ${p.prepay} prepay` : ""}.` : ""} Specs, avionics and the training it supports.` : "Lakes Area Aviation training aircraft.";
    return { meta: [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...(p ? [] : [{ name: "robots", content: "noindex" }])] };
  },
  component: PlanePage,
});

function PlanePage() {
  const f = Route.useLoaderData();
  const [viewer, setViewer] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const specs = Object.entries(f.specs ?? {});
  const equipment = specs.filter(([k]) => ["GPS", "Equipment", "IFR/VFR", "Coms"].includes(k));
  const endorsements = ENDORSEMENTS[f.role];
  const i = fleet.findIndex((p) => p.registration === f.registration);
  const prev = fleet[(i - 1 + fleet.length) % fleet.length]!;
  const next = fleet[(i + 1) % fleet.length]!;
  const open = (btn: HTMLButtonElement) => { opener.current = btn; setViewer(true); };

  return (
    <SiteLayout>
      <div className="site-container pb-16 pt-20 sm:pt-28">
        <Link to="/fleet" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><ArrowLeft className="size-4" /> All aircraft</Link>
        <div className="mt-2 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="relative bg-secondary/60">
            <img src={f.image} srcSet={srcSetFor(f.image)} sizes="(min-width: 1024px) 55vw, 100vw" alt={`${f.name} ${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`} width={1200} height={900} loading="eager" fetchPriority="high" decoding="async" className="fleet-cutout aspect-[4/3] w-full object-contain p-6 max-sm:aspect-[3/2] max-sm:p-4" />
            <button type="button" onClick={(e) => open(e.currentTarget)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-xs font-bold uppercase tracking-[0.14em] text-background backdrop-blur-md hover:bg-primary">
              <Maximize className="size-4" /> View photo
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground/70">{ROLE_LABEL[f.role]} · {f.use}</p>
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{planeTitle(f)}</h1>
            <p className="mt-1 text-lg text-foreground/80">{f.name}</p>

            <div className="mt-6 grid grid-cols-2 border-y-2 border-foreground">
              {f.rate ? <>
                <div className="py-4 pr-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">Regular</p><p className="mt-1 text-3xl font-bold tabular-nums">{f.rate.replace("/hr", "")}<span className="text-sm font-semibold text-foreground/70">/hr</span></p></div>
                <div className="bg-secondary px-4 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">Prepay</p><p className="mt-1 text-3xl font-bold tabular-nums">{(f.prepay ?? f.rate).replace("/hr", "")}<span className="text-sm font-semibold text-foreground/70">/hr</span></p></div>
              </> : <div className="col-span-2 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">Rate</p><a href={SCHOOL_PHONE_TEL} className="mt-1 inline-flex min-h-11 items-center gap-2 text-lg font-bold"><Phone className="size-4" /> Call {SCHOOL_PHONE} for the current rate</a></div>}
            </div>
            {f.rate && <p className="mt-3 text-sm text-foreground/75">{RATE_NOTES.wet} <Link to="/rates" className="font-semibold underline underline-offset-2">All rates</Link></p>}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link to="/contact" search={{ aircraft: f.registration }} className="inline-flex min-h-12 items-center justify-between gap-3 bg-primary px-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">Build my training plan <ArrowRight className="size-4" /></Link>
              <a href={SCHOOL_PHONE_TEL} className="inline-flex min-h-12 items-center justify-center gap-2 border border-foreground px-5 text-xs font-bold uppercase tracking-[0.12em]"><Phone className="size-4" /> Call {SCHOOL_PHONE}</a>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-14">
          {specs.length > 0 && (
            <section>
              <h2 className="border-b border-foreground pb-2 font-display text-2xl">Specifications</h2>
              <dl className="divide-y divide-border">
                {specs.map(([k, v]) => <div key={k} className="grid grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-3 py-2.5"><dt className="text-sm text-foreground/70">{k}</dt><dd className="text-sm font-semibold">{v}</dd></div>)}
              </dl>
            </section>
          )}
          {(equipment.length > 0 || f.panel) && (
            <section>
              <h2 className="border-b border-foreground pb-2 font-display text-2xl">Panel & avionics</h2>
              {f.panel && <img src={f.panel} alt={`${f.registration} instrument panel`} loading="lazy" decoding="async" className="mt-3 aspect-[16/9] w-full object-cover" />}
              {equipment.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{equipment.map(([k, v]) => <li key={k}><span className="text-foreground/70">{k}: </span><span className="font-semibold">{v}</span></li>)}</ul>}
            </section>
          )}
          <section>
            <h2 className="border-b border-foreground pb-2 font-display text-2xl">Used in training</h2>
            <p className="mt-3 text-sm text-foreground/80">{f.use}. {f.note}</p>
            <ul className="mt-2 divide-y divide-border">
              {TRAINING[f.role].map((t) => <li key={t.to}><a href={t.to} className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">{t.label}<ArrowRight className="size-4 shrink-0" /></a></li>)}
            </ul>
            {endorsements.length > 0 && <>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.14em]">Ratings & endorsements</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{endorsements.map((e) => <li key={e}>{e}</li>)}</ul>
            </>}
          </section>
        </div>

        <nav aria-label="More aircraft" className="mt-14 grid grid-cols-2 gap-px border border-border bg-border">
          {[["Previous", prev], ["Next", next] as const].map(([label, p]) => (
            <Link key={label} to="/fleet/$reg" params={{ reg: planeSlug(p) }} className={`flex min-h-16 flex-col justify-center bg-background px-4 py-3 ${label === "Next" ? "items-end text-right" : ""}`}>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/65">{label}</span>
              <span className="font-display text-lg leading-tight">{planeTitle(p)}</span>
            </Link>
          ))}
        </nav>
      </div>
      <InquiryBand />
      {viewer && (
        <Suspense fallback={<div className="fixed inset-0 z-[80] bg-ink" />}>
          <AircraftViewer plane={f} onClose={() => { setViewer(false); opener.current?.focus(); }} />
        </Suspense>
      )}
    </SiteLayout>
  );
}
