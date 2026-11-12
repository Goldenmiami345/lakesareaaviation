import { createFileRoute, Link } from "@tanstack/react-router";
import { srcSetFor } from "@/lib/responsive-image";
import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Maximize, X } from "lucide-react";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { Button } from "../components/ui/button";
import { fleet, type FleetRole } from "../lib/site-data";
import { ENDORSEMENTS, keyStats, planeSlug, ROLE_LABEL, TRAINING, type Plane } from "../lib/fleet-info";

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

const ROLES: { id: FleetRole | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trainer", label: "Trainers" },
  { id: "twin", label: "Twin" },
  { id: "tailwheel", label: "Tailwheel" },
];

function Page() {
  const [role, setRole] = useState<FleetRole | "all">("all");
  const [hashId, setHashId] = useState("");
  // Phones: the tile whose quick look is open (tap again or the X to fold it).
  const [quick, setQuick] = useState("");
  const [viewer, setViewer] = useState<Plane | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const opener = useRef<HTMLButtonElement | null>(null);

  // A #tail link (e.g. from the home-page traffic) opens that card before the first paint.
  useLayoutEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1).toLowerCase();
      if (fleet.some((f) => f.registration.toLowerCase() === id)) { setRole("all"); setHashId(id); setQuick(id); }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const shown = fleet.filter((f) => role === "all" || f.role === role);

  // Phone tiles and desktop cards are separate layouts; a #tail link scrolls to whichever is showing.
  useLayoutEffect(() => {
    if (!hashId) return;
    const el = [...document.querySelectorAll<HTMLElement>(`[data-plane="${hashId}"]`)].find((n) => n.offsetParent !== null);
    el?.scrollIntoView({ block: "start" });
  }, [hashId]);
  const openView = (f: Plane) => (btn: HTMLButtonElement, index = 0) => { opener.current = btn; setViewIndex(index); setViewer(f); };

  return (
    <SiteLayout>
      <PageIntro
        eyebrow="Aircraft"
        title="The airplanes you’ll actually fly."
        text="Real photos, real tail numbers and the published rates for every airplane in the Lakes Area Aviation fleet."
        compact
      />
      <div className="site-container pb-20 pt-8 lg:pt-12 max-sm:!px-4 max-sm:pt-5">
        <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2 max-sm:gap-1">
          {ROLES.map((r) => {
            const count = r.id === "all" ? fleet.length : fleet.filter((f) => f.role === r.id).length;
            const on = role === r.id;
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => setRole(r.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors max-sm:min-h-10 max-sm:gap-1 max-sm:px-2.5 max-sm:text-[10px] max-sm:tracking-[0.04em] ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary"}`}>
                {r.label}<span className={on ? "text-primary-foreground" : "text-muted-foreground"}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Phones: compact two-column tiles, about six per screen; a tap folds a quick look open under its row. */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
          {shown.flatMap((f, i) => {
            const id = planeSlug(f);
            const tile = <PlaneTile key={id} f={f} open={quick === id} onToggle={() => setQuick((q) => (q === id ? "" : id))} />;
            // The quick look spans both columns directly after the row that holds the open tile.
            const rowEnd = i % 2 === 1 || i === shown.length - 1;
            const openInRow = shown.slice(i - (i % 2), i + 1).find((x) => planeSlug(x) === quick);
            return rowEnd && openInRow ? [tile, <QuickLook key={`${quick}-quick`} f={openInRow} onClose={() => setQuick("")} onView={openView(openInRow)} />] : [tile];
          })}
        </div>
        <div className="mt-6 grid gap-5 max-sm:hidden md:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => (
            <PlaneCard key={f.registration} f={f} open={hashId === f.registration.toLowerCase()} onView={openView(f)} />
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
  // Phones show the airplane first: details stay folded behind one toggle (larger screens always show them).
  const [more, setMore] = useState(false);
  const details = `${id}-details`;
  const label = `${f.name} ${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`;
  return (
    <article id={id} data-plane={id} className="scroll-mt-20 overflow-hidden border border-border bg-background target:border-primary">
      <div className="relative aspect-[4/3] overflow-hidden bg-background max-sm:aspect-[11/5]">
        {/* Fleet is photos only: no 3D models on this page, whatever the 3D setting is. */}
        <img src={f.image} srcSet={srcSetFor(f.image)} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" alt={label} width={1200} height={900} loading="lazy" decoding="async" className="fleet-cutout h-full w-full object-contain p-5 max-sm:px-3 max-sm:pb-5 max-sm:pt-2" />
        {/* On phones the whole photo opens the viewer, so no pill sits on top of the airplane. */}
        <button type="button" onClick={(e) => onView(e.currentTarget)} aria-label={`View photos of ${label}`} className="absolute inset-0 sm:hidden" />
        <Button variant="secondary" onClick={(e) => onView(e.currentTarget)} className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink/80 px-4 text-xs font-bold uppercase tracking-[0.14em] text-background backdrop-blur-md hover:bg-primary max-sm:hidden">
          <Maximize className="size-4" /> View photo
        </Button>
      </div>
      <div className="p-5 sm:p-6 max-sm:px-4 max-sm:pb-3 max-sm:pt-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-text"><span className="h-px w-5 shrink-0 bg-primary" />{f.registration}
              {f.nickname && <span className="truncate font-display text-sm font-normal normal-case tracking-normal text-muted-foreground sm:hidden">“{f.nickname}”</span>}
            </p>
            <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl max-sm:mt-1 max-sm:text-xl">{f.name}</h2>
            {f.nickname && <p className="font-display text-base text-muted-foreground max-sm:hidden">“{f.nickname}”</p>}
          </div>
          <button type="button" onClick={(e) => onView(e.currentTarget)} aria-label={`View photos of ${label}`} className="-mr-2 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted sm:hidden">
            <Maximize className="size-4" />
          </button>
        </div>
        <dl className="mt-4 flex flex-wrap gap-2 max-sm:mt-2 max-sm:gap-x-3 max-sm:gap-y-0.5">
          {keyStats(f).map((s) => (
            <div key={s.k} className="text-xs sm:rounded-full sm:border sm:border-border sm:px-3 sm:py-1.5">
              <dt className="sr-only">{s.k}</dt>
              <dd><span className="text-muted-foreground">{s.k} </span><span className="font-semibold">{s.v}</span></dd>
            </div>
          ))}
        </dl>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border sm:hidden">
          <button type="button" aria-expanded={more || open} aria-controls={details} onClick={() => setMore((v) => !v)}
            className="group/more inline-flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em]">
            {more || open ? "Less" : "Details"}<ChevronDown className={`size-4 transition-transform ${more || open ? "rotate-180" : ""}`} />
          </button>
          <Link to="/contact" search={{ aircraft: f.registration }} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-text">
            Build my training plan <ArrowRight className="size-4 shrink-0" />
          </Link>
        </div>

        <div id={details} className={`mt-4 divide-y divide-border border-y border-border max-sm:mt-0 max-sm:border-b-0 ${more || open ? "" : "max-sm:hidden"}`}>
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

        <Link to="/fleet/$reg" params={{ reg: id }} className="mt-5 inline-flex min-h-11 w-full items-center justify-between gap-3 border border-foreground px-5 text-xs font-bold uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background max-sm:hidden">
          Full airplane page <ArrowRight className="size-4" />
        </Link>
        <Link to="/contact" search={{ aircraft: f.registration }} className="mt-2 inline-flex min-h-11 w-full items-center justify-between gap-3 bg-primary px-5 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground max-sm:hidden">
          Build my training plan <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function PlaneTile({ f, open, onToggle }: { f: Plane; open: boolean; onToggle: () => void }) {
  const id = planeSlug(f);
  return (
    <article id={`${id}-tile`} data-plane={id} className={`min-w-0 scroll-mt-20 border bg-background transition-colors ${open ? "border-foreground" : "border-border"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-quick`} className="block w-full text-left">
        <span className="relative block aspect-[2/1] overflow-hidden bg-secondary/60">
          <img src={f.image} srcSet={srcSetFor(f.image)} sizes="50vw" alt="" width={600} height={400} loading="lazy" decoding="async" className="fleet-cutout h-full w-full object-contain p-2" />
        </span>
        <span className="block px-2.5 pb-2 pt-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[11px] font-bold tracking-[0.06em]">{f.registration}<span className="ml-1.5 text-[9px] uppercase tracking-[0.12em] text-foreground/60">{ROLE_LABEL[f.role]}</span></span>
            <ChevronDown aria-hidden="true" className={`size-3.5 shrink-0 text-foreground/60 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
          <span className="block truncate font-display text-base leading-tight">{f.nickname ?? f.name.replace(/^\d{4} /, "")}</span>
          <span className="block truncate text-xs text-foreground/70">{f.name}</span>
          <span className="mt-0.5 block text-xs font-bold tabular-nums">{f.rate ? <>{f.rate} <span className="font-semibold text-foreground/60">wet</span></> : <span className="font-semibold text-foreground/60">Ask for rate</span>}</span>
        </span>
      </button>
    </article>
  );
}

function QuickLook({ f, onClose, onView }: { f: Plane; onClose: () => void; onView: (btn: HTMLButtonElement) => void }) {
  const id = planeSlug(f);
  const stats = [...keyStats(f), ...(f.prepay ? [{ k: "Prepay", v: f.prepay }] : [])];
  return (
    <section id={`${id}-quick`} aria-label={`${f.registration} quick look`} className="col-span-2 border border-foreground bg-background p-4 duration-300 animate-in fade-in slide-in-from-top-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">{ROLE_LABEL[f.role]} · {f.use}</p>
          <h2 className="mt-1 font-display text-xl leading-tight">{f.registration}{f.nickname && ` “${f.nickname}”`}</h2>
          <p className="text-sm text-foreground/75">{f.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close quick look" className="-mr-2 -mt-2 grid size-11 place-items-center"><X className="size-4" /></button>
      </div>
      {stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
          {stats.map((s) => <div key={s.k} className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/65">{s.k}</dt><dd className="truncate text-sm font-semibold">{s.v}</dd></div>)}
        </dl>
      )}
      <p className="mt-3 text-sm text-foreground/80">{f.note}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to="/fleet/$reg" params={{ reg: id }} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-foreground px-3 text-xs font-bold uppercase tracking-[0.1em]">Full details <ArrowRight className="size-3.5" /></Link>
        <button type="button" onClick={(e) => onView(e.currentTarget)} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-border px-3 text-xs font-bold uppercase tracking-[0.1em]"><Maximize className="size-3.5" /> Photo</button>
      </div>
      <Link to="/contact" search={{ aircraft: f.registration }} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground">Build my training plan <ArrowRight className="size-3.5" /></Link>
    </section>
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
