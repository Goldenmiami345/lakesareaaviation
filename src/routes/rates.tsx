import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro, SiteLayout } from "../components/site-shell";

const instruction: [string, string][] = [
  ["Primary flight & ground instruction", "$60/hr"],
  ["Instrument flight & ground instruction", "$60/hr"],
  ["Commercial flight & ground instruction", "$60/hr"],
  ["Multi-engine flight & ground instruction", "$75/hr"],
  ["Flight instruction in non-flight-school aircraft", "$70/hr"],
];
const aircraft = [
  { name: "Cessna 172", nick: "“Blue,” “Robin,” or “Phoenix”", reg: "$185", pre: "$175" },
  { name: "Cessna 172I / 172K", nick: "“Hawk” or “Cardinal”", reg: "$185", pre: "$175" },
  { name: "Piper Apache PA-23-160", nick: "N4383P", reg: "$395", pre: "$375" },
  { name: "Piper Comanche PA-24-250", nick: "“Chief”", reg: "$265", pre: "$245" },
  { name: "Cessna 150", nick: "“Elliot”", reg: "$125", pre: "$115" },
  { name: "Taylorcraft BC-12D", nick: "“Tweety”", reg: "$135", pre: "$125" },
];

export const Route = createFileRoute("/rates")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("Aircraft & Training Rates | Lakes Area Aviation", "Published instruction rates, wet aircraft rental rates with prepay pricing, intro flights, housing, and student cars.") }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro eyebrow="Our rates" title="Every published rate, in one place." text="We strive to keep our aircraft costs low to make aviation accessible for everyone. All aircraft rates are wet and include fuel and insurance." />
      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <section data-scroll-reveal>
            <h2 className="eyebrow text-primary-text">Instruction</h2>
            <div className="mt-4 border-y border-border">{instruction.map(([a, b]) => <Row key={a} a={a} b={b} />)}</div>
          </section>
          <section data-scroll-reveal>
            <h2 className="eyebrow text-primary-text">Plane rental rates</h2>
            <div className="mt-4 grid gap-px bg-border sm:grid-cols-2">
              {aircraft.map((x) => (
                <article key={x.name + x.nick} className="min-w-0 bg-background p-5">
                  <h3 className="font-display text-xl leading-tight">{x.name}</h3>
                  <p className="text-sm text-muted-foreground">{x.nick}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div><p className="text-xs uppercase text-muted-foreground">Regular</p><p className="font-display text-2xl">{x.reg}<span className="text-sm">/hr</span></p></div>
                    <div className="text-right"><p className="text-xs uppercase text-primary-text">Prepay</p><p className="font-display text-2xl text-primary-text">{x.pre}<span className="text-sm">/hr</span></p></div>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">All rates are wet rates and include fuel and insurance. State tax is additional. The prepay rate is automatically applied when a student or renter has $500 or more in their account at the time of billing.</p>
          </section>
        </div>
        <section className="mt-16 border-y border-border" data-scroll-reveal>
          <Row a="Introductory flight" b="$100" />
          <Row a="Scenic flight (up to three people)" b="$129/hr" />
          <Row a="Student housing" b="$30/night" />
          <Row a="Student cars (housing residents)" b="$20/day" />
        </section>
        <div className="mt-16 bg-secondary p-8 md:p-12">
          <h2 className="font-display text-3xl sm:text-4xl">Get a plan, not a vague total.</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">Aircraft time varies with the rating, your current experience, and proficiency. Share your logbook totals and goals for a useful training estimate.</p>
          <Link to="/contact" className="mt-8 inline-flex bg-primary px-6 py-4 text-sm font-bold uppercase text-primary-foreground">Request a training estimate</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
function Row({ a, b }: { a: string; b: string }) {
  return <div className="flex items-center justify-between gap-5 border-b border-border py-4 last:border-0"><span className="min-w-0">{a}</span><strong className="shrink-0">{b}</strong></div>;
}
const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
