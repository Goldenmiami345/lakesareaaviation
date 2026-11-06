import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Car, Check, House, PlaneLanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { submitTrainingLead } from "../lib/leads.functions";
import { CONTINGENCY_RATE, formatPhone, leadSchema, RATING_PREREQUISITES, withPrerequisites } from "../lib/lead-schema";
import { PageIntro, SiteLayout } from "../components/site-shell";
import { locations, SCHOOL_PHONE, SCHOOL_PHONE_TEL , fleet } from "../lib/site-data";

type Rating = { id: string; name: string; days: number; cost: number; prerequisite?: string };
const ratings: Rating[] = [
  { id: "private", name: "Private Pilot", days: 21, cost: 9600 },
  { id: "instrument", name: "Instrument Rating", days: 10, cost: 8300, prerequisite: RATING_PREREQUISITES["instrument"] },
  { id: "commercial-single", name: "Commercial Single-Engine", days: 5, cost: 4625, prerequisite: RATING_PREREQUISITES["commercial-single"] },
  { id: "commercial-multi", name: "Commercial Multi-Engine", days: 3, cost: 5300, prerequisite: RATING_PREREQUISITES["commercial-multi"] },
  { id: "cfi", name: "Certified Flight Instructor", days: 7, cost: 5125, prerequisite: RATING_PREREQUISITES["cfi"] },
  { id: "cfii", name: "CFI–Instrument", days: 5, cost: 3150, prerequisite: RATING_PREREQUISITES["cfii"] },
  { id: "mei", name: "Multi-Engine Instructor", days: 3, cost: 4475, prerequisite: RATING_PREREQUISITES["mei"] },
];

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({ meta: meta("Build Your Training Plan | Lakes Area Aviation", "Select the ratings you have and want, then estimate your minimum training timeline, housing, and transportation.") }),
  validateSearch: (search: Record<string, unknown>): { location?: string; program?: string; aircraft?: string } => ({
    ...(typeof search["aircraft"] === "string" ? { aircraft: search["aircraft"] } : {}),
    ...(typeof search["location"] === "string" ? { location: search["location"] } : {}),
    ...(typeof search["program"] === "string" ? { program: search["program"] } : {}),
  }),
  component: ContactPage,
});

function ContactPage() {
  const { location, aircraft } = Route.useSearch();
  const plane = fleet.find((f) => aircraft && f.registration.toUpperCase() === aircraft.toUpperCase());
  const preferred = locations.find((l) => location && l.airport.toUpperCase().includes(location.toUpperCase()))?.city ?? "";
  const [earned, setEarned] = useState<string[]>([]);
  const [planned, setPlanned] = useState<string[]>(["cfi", "cfii"]);
  const [housing, setHousing] = useState(true);
  const [car, setCar] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [summary, setSummary] = useState<{ name: string; ratings: string[]; location: string; start: string; total: number } | null>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!sent) return;
    const h = confirmRef.current; if (!h) return;
    const t = setTimeout(() => { h.scrollIntoView({ behavior: "smooth", block: "center" }); h.focus({ preventScroll: true }); }, 250);
    return () => clearTimeout(t);
  }, [sent]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const plannerRef = useRef<HTMLDivElement>(null);
  const [inPlanner, setInPlanner] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const el = plannerRef.current; const bd = document.getElementById("breakdown"); if (!el || !bd) return;
    const io = new IntersectionObserver(([e]) => setInPlanner(!!e?.isIntersecting), { rootMargin: "0px 0px -30% 0px" });
    const io2 = new IntersectionObserver(([e]) => setBreakdownVisible(!!e?.isIntersecting), { rootMargin: "0px 0px -25% 0px" });
    io.observe(el); io2.observe(bd); return () => { io.disconnect(); io2.disconnect(); };
  }, []);
  const showBar = inPlanner && !breakdownVisible;
  const submitLead = useServerFn(submitTrainingLead);
  const aircraftNote = plane ? `I’d like to train in ${plane.registration}${plane.nickname ? ` “${plane.nickname}”` : ""} (${plane.name}).` : "";
  const selected = ratings.filter(r => planned.includes(r.id) && !earned.includes(r.id));
  const totals = useMemo(() => {
    const days = selected.reduce((sum, r) => sum + r.days, 0);
    const training = selected.reduce((sum, r) => sum + r.cost, 0);
    const lodging = housing ? days * 30 : 0;
    const transportation = car ? days * 20 : 0;
    const total = training + lodging + transportation;
    const contingency = Math.round(total * CONTINGENCY_RATE);
    return { days, training, lodging, transportation, total, contingency, buffered: total + contingency };
  }, [selected, housing, car]);

  function toggle(list: string[], setList: (value: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter(value => value !== id) : [...list, id]);
  }
  // Checking a planned rating also checks every rating it builds on (Commercial brings Private, etc.).
  function togglePlanned(id: string) {
    setPlanned(planned.includes(id) ? planned.filter(value => value !== id) : withPrerequisites([...planned, id], earned));
  }
  function markEarned(id: string) {
    toggle(earned, setEarned, id);
    if (!earned.includes(id)) setPlanned(planned.filter(value => value !== id));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    const nameOf = (id: string) => ratings.find(r => r.id === id)?.name ?? id;
    const payload = {
      firstName: v("firstName"), lastName: v("lastName"), email: v("email"), phone: v("phone"),
      preferredLocation: v("preferredLocation"), targetStartDate: v("targetStartDate"), notes: v("notes"),
      ratingsHeld: earned.map(nameOf), ratingsPlanned: selected.map(r => r.name),
      housing, car, airportPickup: pickup, trainingDays: totals.days, estimatedTotal: totals.total, contingency: totals.contingency, bufferedTotal: totals.buffered,
      aircraftNote, sourceUrl: window.location.href.slice(0, 500), website: v("website"),
    };
    const check = leadSchema.safeParse(payload);
    if (!check.success) { setError(check.error.issues[0]?.message ?? "Please check the form."); return; }
    setBusy(true); setError("");
    try {
      const res = await submitLead({ data: check.data });
      if (res.ok) {
        (document.activeElement as HTMLElement | null)?.blur();
        setSentPhone(formatPhone(check.data.phone));
        setSummary({ name: check.data.firstName, ratings: check.data.ratingsPlanned, location: check.data.preferredLocation, start: check.data.targetStartDate, total: totals.buffered });
        setSent(true);
        toast.success("Request received. We'll be in touch soon.", { duration: 4000 });
      }
      else setError(res.error === "rate_limited" ? `Too many requests in a short time. Please call ${SCHOOL_PHONE} or try again in a few minutes.` : `We couldn't send your request. Please call ${SCHOOL_PHONE} and we'll take care of you.`);
    } catch {
      setError(`We couldn't send your request. Please call ${SCHOOL_PHONE} and we'll take care of you.`);
    } finally { setBusy(false); }
  }

  return <SiteLayout>
    <PageIntro eyebrow="Training plan estimator" title="Build your training plan." text="Check what you already hold, choose what comes next, and see the published commitment before you call. All prices are estimates." />
    <div className="site-container py-14 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr]">
        <div ref={plannerRef}>
          <PlannerStep number="01" title="Ratings you already have">
            <div className="grid grid-cols-2 gap-2">{ratings.map(r => <Choice key={r.id} checked={earned.includes(r.id)} onChange={() => markEarned(r.id)} label={r.name} detail="Completed" />)}</div>
          </PlannerStep>
          <PlannerStep number="02" title="Ratings you plan to earn">
            {earned.length > 0 && <p className="-mt-2 mb-3 text-xs text-muted-foreground">Ratings you already hold are greyed out.</p>}<div className="grid grid-cols-2 gap-2">{ratings.map(r => <Choice key={r.id} checked={planned.includes(r.id) && !earned.includes(r.id)} disabled={earned.includes(r.id)} onChange={() => togglePlanned(r.id)} label={r.name} detail={earned.includes(r.id) ? "Already completed" : `${r.days}+ days · ${money(r.cost)}`} />)}</div>
          </PlannerStep>
          <PlannerStep number="03" title="Travel support">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <ServiceChoice checked={housing} onChange={() => setHousing(!housing)} icon={<House />} title="Housing" detail="$30 / night" />
              <ServiceChoice checked={car} onChange={() => setCar(!car)} icon={<Car />} title="Student car" detail="$20 / day" />
              <ServiceChoice checked={pickup} onChange={() => setPickup(!pickup)} icon={<PlaneLanding />} title="Airport pickup" detail="Confirm with team" />
            </div>
          </PlannerStep>
        </div>

        <div id="breakdown" className="h-fit scroll-mt-24 bg-ink p-6 text-background lg:sticky lg:top-24 sm:p-8">
          <p className="stage-label">Your estimate</p>
          <div className="mt-6 grid grid-cols-2 gap-px bg-background/20">
            <Result value={`${totals.days}+`} label="Training days" />
            <Result value={money(totals.buffered)} label="Estimated total, incl. 20% buffer" />
          </div>
          <div className="mt-6 space-y-3 border-y border-background/20 py-5 text-sm">
            <Line label="Training" value={money(totals.training)} />
            {housing && <Line label={`Housing · ${totals.days} nights`} value={money(totals.lodging)} />}
            {car && <Line label={`Car · ${totals.days} days`} value={money(totals.transportation)} />}
            {pickup && <Line label="Airport pickup" value="To confirm" />}
            <Line label="Contingency (20%)" value={money(totals.contingency)} />
            <div className="border-t border-background/20 pt-3"><Line label="Estimated total" value={money(totals.buffered)} /></div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-background/60">All prices are estimates, based on published minimum course days and prices, plus a 20% buffer. Weather, proficiency, examiner fees, tax, aircraft availability, prerequisites, and time-building can change the final schedule and cost.</p>
          <a href="#request" className="mt-6 flex min-h-13 items-center justify-center bg-primary px-5 text-center text-sm font-bold uppercase text-primary-foreground">Send this plan</a>
        </div>
      </div>

      <section id="request" className="mt-20 scroll-mt-24 border-t border-border pt-14">
        {sent ? <div className="bg-secondary p-6 sm:p-10"><Check className="size-10 text-primary-text" aria-hidden="true" /><h2 ref={confirmRef} tabIndex={-1} className="mt-4 font-display text-4xl outline-none">Request received{summary?.name ? `, ${summary.name}` : ""}.</h2>
          {summary && <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Ratings planned</dt><dd className="mt-1">{summary.ratings.length ? summary.ratings.join(", ") : "To discuss"}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Preferred location</dt><dd className="mt-1">{summary.location}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Target start date</dt><dd className="mt-1">{summary.start ? new Date(summary.start + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Flexible"}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-muted-foreground">Estimated total, incl. 20% buffer</dt><dd className="mt-1">{money(summary.total)}</dd></div>
          </dl>}
          <p className="mt-6 max-w-2xl text-muted-foreground"><strong className="text-foreground">What happens next:</strong> our team reviews your plan and contacts you to confirm dates{sentPhone ? ` at ${sentPhone}` : ""}.</p>
          <a href={SCHOOL_PHONE_TEL} className="mt-6 inline-flex min-h-12 items-center bg-primary px-6 text-sm font-bold uppercase text-primary-foreground">Call {SCHOOL_PHONE}</a></div> : <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="eyebrow text-primary-text">Request a review</p><h2 className="mt-4 font-display text-4xl">Put real dates around your plan.</h2><a href={SCHOOL_PHONE_TEL} className="mt-6 -mb-2 inline-flex min-h-11 items-center font-display text-2xl text-primary-text">{SCHOOL_PHONE}</a></div><form onSubmit={onSubmit} className="relative grid min-w-0 gap-5 sm:grid-cols-2">
          <Field name="firstName" label="First name" autoComplete="given-name" /><Field name="lastName" label="Last name" autoComplete="family-name" /><Field name="email" label="Email" type="email" autoComplete="email" /><Field name="phone" label="Phone" type="tel" />
          <Select key={preferred} label="Preferred location" options={locations.map(l => l.city)} defaultValue={preferred} /><Field name="targetStartDate" label="Target start date" type="date" required={false} />
          <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase">Anything else we should know?</span><textarea name="notes" maxLength={2000} key={plane?.registration ?? ""} defaultValue={plane ? aircraftNote : ""} className="min-h-28 w-full border border-input bg-background p-4 outline-none focus:border-primary" /></label>
          <div aria-hidden="true" className="sr-only"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <Button disabled={busy} className="min-h-14 rounded-none sm:col-span-2">{busy ? "Sending…" : "Send my training plan request"}</Button>
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className="outline-none text-sm text-destructive sm:col-span-2">{error}</p>}
        </form></div>}
      </section>
    </div>
    {mounted && createPortal(<Toaster position="top-center" offset={84} mobileOffset={{ top: 84 }} icons={{ success: <Check className="size-4 text-primary-text" /> }} />, document.body)}
    {mounted && createPortal(<div aria-live="polite" className={`fixed inset-x-0 bottom-0 z-40 border-t border-background/15 bg-ink px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 text-background shadow-2xl transition-transform duration-300 lg:hidden ${showBar ? "translate-y-0" : "pointer-events-none translate-y-full"}`}>
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0"><p className="font-display text-2xl leading-none">{money(totals.buffered)}</p><p className="mt-1 truncate text-xs font-bold uppercase text-background/60">{totals.days}+ days · est. incl. 20% buffer</p></div>
        <a href="#breakdown" className="flex min-h-11 shrink-0 items-center border border-background/40 px-4 text-xs font-bold uppercase">See breakdown</a>
      </div>
    </div>, document.body)}
  </SiteLayout>;
}

function PlannerStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="border-t border-border py-8 first:border-0 first:pt-0"><h2 className="mb-5 flex items-baseline gap-3 font-display text-2xl sm:text-3xl"><span className="text-primary-text">{number}</span><span>{title}</span></h2>{children}</section>; }
function Choice({ checked, disabled, onChange, label, detail }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string; detail: string }) { return <label className={`flex min-h-14 cursor-pointer items-center gap-2.5 border px-3 py-2.5 transition-colors sm:min-h-20 sm:gap-4 sm:p-4 ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}><input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} /><span className={`grid size-5 shrink-0 place-items-center border ${checked ? "border-primary-foreground" : "border-foreground/30"}`}>{checked && <Check className="size-3" />}</span><span className="min-w-0"><strong className="block text-[13px] leading-tight sm:text-sm">{label}</strong><span className={`mt-0.5 block text-xs sm:mt-1 sm:text-xs ${checked ? "text-primary-foreground" : "text-muted-foreground"}`}>{detail}</span></span></label>; }
function ServiceChoice({ checked, onChange, icon, title, detail }: { checked: boolean; onChange: () => void; icon: React.ReactNode; title: string; detail: string }) { return <Button type="button" aria-pressed={checked} variant={checked ? "default" : "outline"} onClick={onChange} className="h-auto min-h-16 flex-col items-start whitespace-normal rounded-none p-3 text-left sm:min-h-32 sm:p-4"><span className="block [&_svg]:size-5">{icon}</span><strong className="mt-2 block text-sm sm:mt-6">{title}</strong><span className={`block text-xs ${checked ? "text-primary-foreground" : "text-muted-foreground"}`}>{detail}</span></Button>; }
function Result({ value, label }: { value: string; label: string }) { return <div className="bg-ink p-4"><p className="font-display text-3xl text-background">{value}</p><p className="mt-1 text-xs font-bold uppercase text-background/55">{label}</p></div>; }
function Line({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-background/70">{label}</span><strong>{value}</strong></div>; }
function Field({ label, name, type = "text", required = true, autoComplete }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string }) { return <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase">{label}</span><input name={name} inputMode={type === "tel" ? "tel" : undefined} autoComplete={autoComplete ?? (type === "tel" ? "tel" : undefined)} required={required} maxLength={type === "email" ? 255 : 60} type={type} className={`box-border h-14 w-full min-w-0 max-w-full border border-input bg-background px-4 outline-none focus:border-primary ${type === "date" ? "date-field" : ""}`} /></label>; }
function Select({ label, options, defaultValue = "" }: { label: string; options: string[]; defaultValue?: string }) { return <label className="min-w-0"><span className="mb-2 block text-xs font-bold uppercase">{label}</span><select name="preferredLocation" required defaultValue={defaultValue} className="h-14 w-full border border-input bg-background px-4"><option value="">Select</option>{options.map(x => <option key={x}>{x}</option>)}</select></label>; }
function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
const meta = (title: string, description: string) => [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];