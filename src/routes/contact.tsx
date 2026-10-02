import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Car, Check, House, PlaneLanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro, SiteLayout } from "../components/site-shell";
import { locations, SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";

type Rating = { id: string; name: string; days: number; cost: number; prerequisite?: string };
const ratings: Rating[] = [
  { id: "private", name: "Private Pilot", days: 21, cost: 9600 },
  { id: "instrument", name: "Instrument Rating", days: 10, cost: 8300, prerequisite: "private" },
  { id: "commercial-single", name: "Commercial Single-Engine", days: 5, cost: 4625, prerequisite: "instrument" },
  { id: "commercial-multi", name: "Commercial Multi-Engine", days: 3, cost: 5300, prerequisite: "private" },
  { id: "cfi", name: "Certified Flight Instructor", days: 7, cost: 5125, prerequisite: "commercial-single" },
  { id: "cfii", name: "CFI–Instrument", days: 5, cost: 3150, prerequisite: "cfi" },
  { id: "mei", name: "Multi-Engine Instructor", days: 3, cost: 4475, prerequisite: "commercial-multi" },
];

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: meta("Build Your Training Plan | Lakes Area Aviation", "Select the ratings you have and want, then estimate your minimum training timeline, housing, and transportation.") }),
  component: ContactPage,
});

function ContactPage() {
  const [earned, setEarned] = useState<string[]>([]);
  const [planned, setPlanned] = useState<string[]>(["cfi", "cfii"]);
  const [housing, setHousing] = useState(true);
  const [car, setCar] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [sent, setSent] = useState(false);
  const selected = ratings.filter(r => planned.includes(r.id) && !earned.includes(r.id));
  const totals = useMemo(() => {
    const days = selected.reduce((sum, r) => sum + r.days, 0);
    const training = selected.reduce((sum, r) => sum + r.cost, 0);
    const lodging = housing ? days * 30 : 0;
    const transportation = car ? days * 20 : 0;
    return { days, training, lodging, transportation, total: training + lodging + transportation };
  }, [selected, housing, car]);

  function toggle(list: string[], setList: (value: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(value => value !== id) : [...list, id]);
  }
  function markEarned(id: string) {
    toggle(earned, setEarned, id);
    if (!earned.includes(id)) setPlanned(planned.filter(value => value !== id));
  }

  return <SiteLayout>
    <PageIntro eyebrow="Start the conversation" title="Build your training plan." text="Check what you already hold, choose what comes next, and see the minimum published commitment before you call." />
    <main className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr]">
        <div>
          <PlannerStep number="01" title="Ratings you already have">
            <div className="grid gap-2 sm:grid-cols-2">{ratings.map(r => <Choice key={r.id} checked={earned.includes(r.id)} onChange={() => markEarned(r.id)} label={r.name} detail="Completed" />)}</div>
          </PlannerStep>
          <PlannerStep number="02" title="Ratings you plan to earn">
            <div className="grid gap-2 sm:grid-cols-2">{ratings.map(r => <Choice key={r.id} checked={planned.includes(r.id)} disabled={earned.includes(r.id)} onChange={() => toggle(planned, setPlanned, r.id)} label={r.name} detail={`${r.days}+ days · ${money(r.cost)}`} />)}</div>
          </PlannerStep>
          <PlannerStep number="03" title="Travel support">
            <div className="grid gap-3 sm:grid-cols-3">
              <ServiceChoice checked={housing} onChange={() => setHousing(!housing)} icon={<House />} title="Housing" detail="$30 / night" />
              <ServiceChoice checked={car} onChange={() => setCar(!car)} icon={<Car />} title="Student car" detail="$20 / day" />
              <ServiceChoice checked={pickup} onChange={() => setPickup(!pickup)} icon={<PlaneLanding />} title="Airport pickup" detail="Confirm with team" />
            </div>
          </PlannerStep>
        </div>

        <aside className="h-fit bg-ink p-6 text-background lg:sticky lg:top-24 sm:p-8">
          <p className="eyebrow photo-label">Your minimum plan</p>
          <div className="mt-6 grid grid-cols-2 gap-px bg-background/20">
            <Result value={`${totals.days}+`} label="Training days" />
            <Result value={money(totals.total)} label="Estimated minimum" />
          </div>
          <div className="mt-6 space-y-3 border-y border-background/20 py-5 text-sm">
            <Line label="Training" value={money(totals.training)} />
            {housing && <Line label={`Housing · ${totals.days} nights`} value={money(totals.lodging)} />}
            {car && <Line label={`Car · ${totals.days} days`} value={money(totals.transportation)} />}
            {pickup && <Line label="Airport pickup" value="To confirm" />}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-background/60">Planning estimate based on published minimum course days and prices. Weather, proficiency, examiner fees, tax, aircraft availability, prerequisites, and time-building can change the final schedule and cost.</p>
          <a href="#request" className="mt-6 flex min-h-13 items-center justify-center bg-primary px-5 text-center text-sm font-bold uppercase text-primary-foreground">Send this plan</a>
        </aside>
      </div>

      <section id="request" className="mt-20 scroll-mt-24 border-t border-border pt-14">
        {sent ? <div className="grid min-h-80 place-items-center bg-secondary p-8 text-center"><div><Check className="mx-auto size-10 text-primary" /><h2 className="mt-5 font-display text-4xl">Your plan is ready to review.</h2><p className="mt-3 text-muted-foreground">Call {SCHOOL_PHONE} to confirm dates, availability, pickup, and your written estimate.</p></div></div> : <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="eyebrow text-primary">Request a review</p><h2 className="mt-4 font-display text-4xl">Put real dates around your plan.</h2><a href={SCHOOL_PHONE_TEL} className="mt-7 inline-block font-display text-2xl text-primary">{SCHOOL_PHONE}</a></div><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSent(true); }} className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" /><Field label="Last name" /><Field label="Email" type="email" /><Field label="Phone" type="tel" />
          <Select label="Preferred location" options={locations.map(l => l.city)} /><Field label="Target start date" type="date" />
          <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase">Anything else we should know?</span><textarea className="min-h-28 w-full border border-input bg-background p-4 outline-none focus:border-primary" /></label>
          <Button className="min-h-14 rounded-none sm:col-span-2">Send my training plan request</Button>
          <p className="text-xs text-muted-foreground sm:col-span-2">This preview confirms your request on screen. Connect the final form destination before publishing to receive submissions.</p>
        </form></div>}
      </section>
    </main>
  </SiteLayout>;
}

function PlannerStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="border-t border-border py-8 first:border-0 first:pt-0"><div className="mb-5 flex items-baseline gap-4"><span className="font-display text-xl text-primary">{number}</span><h2 className="font-display text-3xl">{title}</h2></div>{children}</section>; }
function Choice({ checked, disabled, onChange, label, detail }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string; detail: string }) { return <label className={`flex min-h-20 cursor-pointer items-center gap-4 border p-4 transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}><input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} /><span className={`grid size-5 shrink-0 place-items-center border ${checked ? "border-primary-foreground" : "border-foreground/30"}`}>{checked && <Check className="size-3" />}</span><span><strong className="block text-sm">{label}</strong><span className={`mt-1 block text-xs ${checked ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{detail}</span></span></label>; }
function ServiceChoice({ checked, onChange, icon, title, detail }: { checked: boolean; onChange: () => void; icon: React.ReactNode; title: string; detail: string }) { return <button type="button" aria-pressed={checked} onClick={onChange} className={`min-h-32 border p-4 text-left transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}><span className="block [&_svg]:size-5">{icon}</span><strong className="mt-6 block text-sm">{title}</strong><span className={`mt-1 block text-xs ${checked ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{detail}</span></button>; }
function Result({ value, label }: { value: string; label: string }) { return <div className="bg-ink p-4"><p className="font-display text-3xl text-background">{value}</p><p className="mt-1 text-[.65rem] font-bold uppercase text-background/55">{label}</p></div>; }
function Line({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-background/70">{label}</span><strong>{value}</strong></div>; }
function Field({ label, type = "text" }: { label: string; type?: string }) { return <label><span className="mb-2 block text-xs font-bold uppercase">{label}</span><input required type={type} className="h-14 w-full border border-input bg-background px-4 outline-none focus:border-primary" /></label>; }
function Select({ label, options }: { label: string; options: string[] }) { return <label><span className="mb-2 block text-xs font-bold uppercase">{label}</span><select required className="h-14 w-full border border-input bg-background px-4"><option value="">Select</option>{options.map(x => <option key={x}>{x}</option>)}</select></label>; }
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
const meta = (title: string, description: string) => [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];