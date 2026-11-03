import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Maximize } from "lucide-react";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { Button } from "../components/ui/button";
import { AircraftMedia } from '../components/aircraft-media';
import { aircraftModelUrl } from '../lib/aircraft-models';
import { fleet, type FleetRole } from "../lib/site-data";

// The viewer code is only downloaded when a visitor opens it.
const AircraftViewer = lazy(() => import("../components/aircraft-viewer"));

export const Route = createFileRoute("/fleet")({
  staticData: { sitemap: true },
  head: () => ({
    meta: m(
      "Training Fleet | Lakes Area Aviation",
      "Explore the actual Lakes Area Aviation aircraft used for primary, instrument, commercial, multi-engine, and tailwheel training."
    ),
  }),
  component: Page,
});

type Plane = (typeof fleet)[number];
const ROLES: { id: FleetRole | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trainer", label: "Trainers" },
  { id: "twin", label: "Twin" },
  { id: "tailwheel", label: "Tailwheel" },
];

// Training each airplane supports, taken from the published program pages.
const TRAINING: Record<FleetRole, { label: string; to: string }[]> = {
  trainer: [
    { label: "Private Pilot", to: "/programs/private-pilot" },
    { label: "Instrument Rating", to: "/programs/instrument-rating" },
    { label: "Commercial Single-Engine", to: "/programs/commercial-single-engine" },
    { label: "CFI & CFII", to: "/programs/cfi-cfii" },
  ],
  twin: [
    { label: "Commercial Multi-Engine", to: "/programs/commercial-multi-engine" },
    { label: "Multi-Engine Instructor", to: "/programs/mei" },
  ],
  tailwheel: [{ label: "Specialized training", to: "/specialized-training" }],
};
const ENDORSEMENTS: Record<FleetRole, string[]> = {
  trainer: [],
  twin: ["Multi-engine class rating (Commercial Multi-Engine)", "Multi-engine instructor (MEI)"],
  tailwheel: ["Tailwheel endorsement"],
};

function keyStats(f: Plane) {
  const s = f.specs ?? {};
  return [
    f.rate ? { k: "Wet rate", v: f.rate } : null,
    s["Seats"] ? { k: "Seats", v: s["Seats"] } : null,
    s["Horsepower"] ? { k: "HP", v: s["Horsepower"] } : null,
    s["GPS"] ? { k: "Avionics", v: s["GPS"] } : s["IFR/VFR"] ? { k: "Rules", v: s["IFR/VFR"] } : null,
  ].filter(Boolean).slice(0, 4) as { k: string; v: string }[];
}

function Page() {
  const [role, setRole] = useState<FleetRole | "all">("all");
  const [hashId, setHashId] = useState("");
  const [viewer, setViewer] = useState<Plane | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const opener = useRef<HTMLButtonElement | null>(null);

  // A #tail link (e.g. from the home-page traffic) opens that card before the first paint.
  useLayoutEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1).toLowerCase();
      if (fleet.some((f) => f.registration.toLowerCase() === id)) { setRole("all"); setHashId(id); }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const shown = fleet.filter((f) => role === "all" || f.role === role);

  return (
    <SiteLayout>
      <PageIntro
        eyebrow="Aircraft"
        title="The airplanes you’ll actually fly."
        text="Real photos, real tail numbers and the published rates for every airplane in the Lakes Area Aviation fleet."
      />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-5 lg:px-8 lg:pt-12">
        <div role="group" aria-label="Filter by role" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {ROLES.map((r) => {
            const count = r.id === "all" ? fleet.length : fleet.filter((f) => f.role === r.id).length;
            const on = role === r.id;
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => setRole(r.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
                {r.label}<span className={on ? "text-primary-foreground" : "text-muted-foreground"}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => (
            <PlaneCard key={f.registration} f={f} open={hashId === f.registration.toLowerCase()}
              onView={(btn, index = 0) => { opener.current = btn; setViewIndex(index); setViewer(f); }} />
          ))}
        </div>
      </div>
      <InquiryBand />
      {viewer && (
        <Suspense fallback={<div className="fixed inset-0 z-[80] bg-ink" />}>
          <AircraftViewer plane={viewer} initialIndex={viewIndex} onClose={() => { setViewer(null); opener.current?.focus(); }} />
        </Suspense>
      )}
    </SiteLayout>
  );
}

function PlaneCard({ f, open, onView }: { f: Plane; open: boolean; onView: (btn: HTMLButtonElement, index?: number) => void }) {
  const id = f.registration.toLowerCase();
  const specs = Object.entries(f.specs ?? {});
  const equipment = specs.filter(([k]) => ["GPS", "Equipment", "IFR/VFR", "Coms"].includes(k));
  const endorsements = ENDORSEMENTS[f.role];
  return (
    <article id={id} className="scroll-mt-20 overflow-hidden border border-border bg-background target:border-primary">
      <div className="relative aspect-[4/3] overflow-hidden bg-background">
        {aircraftModelUrl(f.registration)
          ? <AircraftMedia reg={f.registration} photo={f.image} />
          : <img src={f.image} alt={`${f.name} ${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`} width={1200} height={900} loading="lazy" decoding="async" className="fleet-cutout h-full w-full object-contain p-5" />}
        <Button variant="secondary" onClick={(e) => onView(e.currentTarget)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-xs font-bold uppercase tracking-[0.14em] text-background backdrop-blur-md hover:bg-primary">
          <Maximize className="size-4" /> View photo
        </Button>
      </div>
      <div className="p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-text"><span className="h-px w-5 bg-primary" />{f.registration}</p>
        <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{f.name}</h2>
        {f.nickname && <p className="font-display text-base text-muted-foreground">“{f.nickname}”</p>}
        <dl className="mt-4 flex flex-wrap gap-2">
          {keyStats(f).map((s) => (
            <div key={s.k} className="rounded-full border border-border px-3 py-1.5 text-xs">
              <dt className="sr-only">{s.k}</dt>
              <dd><span className="text-muted-foreground">{s.k} </span><span className="font-semibold">{s.v}</span></dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 divide-y divide-border border-y border-border">
          {specs.length > 0 && (
            <Section title="Full specs" open={open}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {specs.map(([k, v]) => <div key={k}><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
                {f.prepay && <div><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Prepay rate</dt><dd className="font-semibold">{f.prepay}</dd></div>}
              </dl>
            </Section>
          )}
          {(equipment.length > 0 || f.panel) && (
            <Section title="Equipment & avionics">
              {equipment.length > 0 && <ul className="space-y-1 text-sm">{equipment.map(([k, v]) => <li key={k}><span className="text-muted-foreground">{k}: </span>{v}</li>)}</ul>}
              {f.panel && <img src={f.panel} alt={`${f.registration} instrument panel`} loading="lazy" decoding="async" className="mt-3 aspect-[16/9] w-full object-cover" />}
            </Section>
          )}
          <Section title="Used in training">
            <p className="text-sm text-muted-foreground">{f.use}. {f.note}</p>
            <ul className="mt-2 flex flex-wrap gap-x-4">
              {TRAINING[f.role].map((t) => <li key={t.to}><a href={t.to} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-text">{t.label} →</a></li>)}
            </ul>
          </Section>
          {endorsements.length > 0 && (
            <Section title="Ratings & endorsements">
              <ul className="list-disc space-y-1 pl-5 text-sm">{endorsements.map((e) => <li key={e}>{e}</li>)}</ul>
            </Section>
          )}
        </div>

        <Link to="/contact" search={{ aircraft: f.registration }} className="mt-5 inline-flex min-h-11 w-full items-center justify-between gap-3 bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground">
          Build my training plan <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function Section({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="group/acc" open={open || undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
        {title}<ChevronDown className="size-4 transition-transform group-open/acc:rotate-180" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
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
