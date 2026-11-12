import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import type { ReactNode } from "react";
import { PageIntro, SiteLayout } from "../components/site-shell";
import { instructionRates, otherRates, programs, RATE_NOTES, RATE_SHEET_URL, RATES_YEAR, rentalRates } from "../lib/site-data";

// Course estimates in the order the school publishes its rating sheets.
const courses = programs.flatMap((p) => p.options.map((o) => ({ slug: p.slug, name: p.slug === "cfi-cfii" ? o.name.replace("Certified Flight Instructor–Instrument", "CFII").replace("Certified Flight Instructor", "CFI") : p.name, timeline: o.timeline, cost: o.estimatedCost.replace(/^As low as /, "").replace(/^Approximately /, "About ") })));

export const Route = createFileRoute("/rates")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("Aircraft & Training Rates | Lakes Area Aviation", "Published instruction rates, wet aircraft rental rates with prepay pricing, course estimates, intro flights, housing and student cars. Download the rate sheet.") }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro eyebrow="Our rates" title="Every published rate, in one place." text="We strive to keep our aircraft costs low to make aviation accessible for everyone. All aircraft rates are wet and include fuel and insurance." />
      <div className="site-container pb-20 pt-6 sm:pt-10">
        {/* Rate-sheet header: the year, the wet-rate rule and the download, before any table. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b-2 border-foreground pb-4" data-scroll-reveal>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-foreground">{RATES_YEAR} rate sheet</p>
            <p className="mt-1 text-sm text-foreground/80">{RATE_NOTES.wet}</p>
          </div>
          <a href={RATE_SHEET_URL} download className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-foreground px-4 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-foreground hover:text-background">
            <Download className="size-4" /><span className="max-sm:hidden">Download</span> PDF
          </a>
        </div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <RateTable title="Aircraft rental" unit="Per hour, wet" head={["Aircraft", "Regular", "Prepay"]}
            note={RATE_NOTES.prepay}
            rows={rentalRates.map((r) => [<><span className="block font-semibold">{r.aircraft}</span><span className="block text-sm text-foreground/70">{r.names}</span></>, <Price v={r.regular} />, <Price v={r.prepay} />])} />
          <div className="grid content-start gap-12">
            <RateTable title="Flight instruction" unit="Per hour" head={["Instruction", "Rate"]}
              rows={instructionRates.map((r) => [<span className="font-semibold">{r.label}</span>, <Price v={r.rate} />])} />
            <RateTable title="Flights, housing & travel" head={["Item", "Rate"]}
              rows={otherRates.map((r) => [<span className="font-semibold">{r.label}</span>, <Price v={r.rate} unit="" />])} />
          </div>
        </div>

        <section className="mt-14" data-scroll-reveal>
          <TableTitle title="Course estimates" unit="Published starting totals" />
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-foreground text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/75"><th scope="col" className="py-2 pr-3 font-bold">Course</th><th scope="col" className="py-2 pr-3 font-bold max-sm:hidden">Timeline</th><th scope="col" className="py-2 text-right font-bold">As low as</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.name} className="border-b border-border">
                  <th scope="row" className="py-3 pr-3 font-normal">
                    <Link to="/programs/$slug" params={{ slug: c.slug }} className="group inline-flex min-h-11 flex-col justify-center">
                      <span className="font-semibold group-hover:underline">{c.name}</span>
                      <span className="text-sm text-foreground/70 sm:hidden">{c.timeline}</span>
                    </Link>
                  </th>
                  <td className="py-3 pr-3 text-sm text-foreground/80 max-sm:hidden">{c.timeline}</td>
                  <td className="py-3 text-right"><span className="text-lg font-bold tabular-nums sm:text-xl">{c.cost}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-foreground/75">{RATE_NOTES.examiner} Estimates are for planning, not fixed prices.</p>
        </section>

        <div className="mt-14 grid gap-6 bg-secondary p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Get a plan, not a vague total.</h2>
            <p className="mt-3 max-w-2xl text-foreground/80">Aircraft time varies with the rating, your experience and proficiency. Share your logbook totals and goals for a useful estimate.</p>
          </div>
          <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-6 text-sm font-bold uppercase text-primary-foreground">Build my training plan <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </SiteLayout>
  );
}

function TableTitle({ title, unit }: { title: string; unit?: string }) {
  return <div className="mb-1 flex items-baseline justify-between gap-3"><h2 className="font-display text-2xl leading-tight sm:text-3xl">{title}</h2>{unit && <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">{unit}</p>}</div>;
}

function RateTable({ title, unit, head, rows, note }: { title: string; unit?: string; head: string[]; rows: ReactNode[][]; note?: string }) {
  const priced = head.length - 1;
  return (
    <section data-scroll-reveal>
      <TableTitle title={title} unit={unit} />
      <table className="w-full border-collapse text-left">
        <thead><tr className="border-b border-foreground text-[11px] uppercase tracking-[0.14em] text-foreground/75">
          {head.map((h, i) => <th key={h} scope="col" className={`py-2 font-bold ${i === 0 ? "pr-3" : "w-[5.5rem] px-2 text-right sm:w-28"} ${i === 2 ? "bg-secondary" : ""}`}>{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border">
              {r.map((cell, i) => i === 0
                ? <th key={i} scope="row" className="py-3 pr-3 font-normal leading-snug">{cell}</th>
                : <td key={i} className={`px-2 py-3 text-right align-middle ${i === 2 ? "bg-secondary" : ""}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {note && priced > 1 && <p className="mt-3 text-sm leading-relaxed text-foreground/75">{note}</p>}
    </section>
  );
}

function Price({ v, unit = "/hr" }: { v: string; unit?: string }) {
  return <span className="whitespace-nowrap text-lg font-bold tabular-nums text-foreground sm:text-xl">{v}{unit && <span className="text-xs font-semibold text-foreground/70">{unit}</span>}</span>;
}

const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
