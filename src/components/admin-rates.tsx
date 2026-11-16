import { useEffect, useMemo, useState } from "react";
import { Eye, History, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aircraftChoicesFor, applyRates, cleanConfig, defaultAircraftFor, rateImpact, type RatesConfig } from "@/lib/rates-engine";
import { instructionRates, otherRates, programs } from "@/lib/site-data";
import { resetLiveRates } from "@/lib/use-live-rates";
import type { Json } from "@/integrations/supabase/types";
import { SitePreview } from "./site-preview";
import { ROW, ROW_ACTIONS, ROW_BTN, STICKY_SAVE } from "./admin-ui";
import { ratePages } from "@/lib/site-preview";

type Version = { id: string; config: Json; note: string | null; saved_at: string };
const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const field = "h-10 w-20 sm:w-24 border border-input bg-background px-2 text-right tabular-nums outline-none focus:border-primary";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

/** Rates editor: inputs, live impact preview, Save with note, version history with one-click restore. */
export function AdminRates() {
  const [saved, setSaved] = useState<RatesConfig>({});
  const [draft, setDraft] = useState<RatesConfig>({});
  const [history, setHistory] = useState<Version[]>([]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);

  async function load() {
    const [{ data: cur }, { data: hist }] = await Promise.all([
      supabase.from("site_rates").select("config").eq("id", "current").maybeSingle(),
      supabase.from("site_rates_history").select("id, config, note, saved_at").order("replaced_at", { ascending: false }).limit(30),
    ]);
    const c = cleanConfig(cur?.config); setSaved(c); setDraft(c); setHistory((hist ?? []) as Version[]);
  }
  useEffect(() => { void load(); }, []);

  const base = useMemo(() => applyRates(saved), [saved]);
  const next = useMemo(() => applyRates(draft), [draft]);
  const impact = rateImpact(base, next);
  const dirty = JSON.stringify(cleanConfig(draft)) !== JSON.stringify(cleanConfig(saved));

  const rentalOf = (a: string) => { const r = next.rentalRates.find(x => x.aircraft === a)!; return { regular: num(r.regular), prepay: num(r.prepay) }; };
  // Lines the owner added (a new airplane, or one airplane given its own price) live in extraRental.
  const setRental = (a: string, k: "regular" | "prepay", v: number) => setDraft(d => d.extraRental?.some(e => e.aircraft === a)
    ? { ...d, extraRental: d.extraRental.map(e => (e.aircraft === a ? { ...e, [k]: v } : e)) }
    : { ...d, rental: { ...d.rental, [a]: { ...rentalOf(a), [k]: v } } });

  async function write(config: RatesConfig, n: string, done: string) {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("site_rates").update({ config: config as Json, note: n || null }).eq("id", "current");
    if (error) setMsg(error.message); else { setMsg(done); setNote(""); resetLiveRates(); await load(); }
    setBusy(false);
  }

  const optionsWithPlane = programs.flatMap(p => p.options.map(o => ({ name: o.name, def: defaultAircraftFor(o.lineItems), choices: aircraftChoicesFor(o.lineItems, next.config.extraRental) }))).filter(o => o.def && o.choices.length > 1);

  return <div>
    <p className="text-sm text-muted-foreground">Nothing goes live until you press Save, and every save can be undone below.</p>

    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Aircraft rental, per hour (regular / prepay)</h3>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">{next.rentalRates.map(r => { const v = rentalOf(r.aircraft); return <label key={r.aircraft} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 flex-1 break-words">{r.aircraft}{"added" in r && <span className="block text-xs text-muted-foreground">Own price line · {r.names}</span>}</span>
      <input type="number" min={0} max={5000} className={field} value={v.regular} onChange={e => setRental(r.aircraft, "regular", Number(e.target.value))} aria-label={`${r.aircraft} regular`} />
      <input type="number" min={0} max={5000} className={field} value={v.prepay} onChange={e => setRental(r.aircraft, "prepay", Number(e.target.value))} aria-label={`${r.aircraft} prepay`} /></label>; })}</div>
    <p className="mt-1 text-xs text-muted-foreground">Course estimates use the prepay rate.</p>

    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Instruction, per hour</h3>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">{instructionRates.map(r => <label key={r.label} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 flex-1">{r.label}</span>
      <input type="number" min={0} max={5000} className={field} value={num(next.instructionRates.find(x => x.label === r.label)!.rate)} onChange={e => setDraft(d => ({ ...d, instruction: { ...d.instruction, [r.label]: Number(e.target.value) } }))} /></label>)}</div>

    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Flights, housing & travel</h3>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">{otherRates.map(r => <label key={r.label} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 flex-1">{r.label}</span>
      <input maxLength={40} className={`${field} w-32`} value={next.otherRates.find(x => x.label === r.label)!.rate} onChange={e => setDraft(d => ({ ...d, other: { ...d.other, [r.label]: e.target.value } }))} /></label>)}</div>

    <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Airplane each course is priced with</h3>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">{optionsWithPlane.map(o => <label key={o.name} className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-2"><span className="min-w-0">{o.name}</span>
      <select className="h-10 w-auto max-w-full min-w-0 shrink-0 justify-self-start border border-input bg-background px-2 outline-none focus:border-primary" value={draft.assign?.[o.name] ?? o.def!} onChange={e => setDraft(d => { const a = { ...d.assign }; if (e.target.value === o.def) delete a[o.name]; else a[o.name] = e.target.value; return { ...d, assign: a }; })}>
        {o.choices.map(a => <option key={a} value={a}>{a}</option>)}</select></label>)}</div>
    <p className="mt-1 text-xs text-muted-foreground">Multi-engine courses always use the Apache. Change a program's hours under Fleet & courses.</p>

    <div className="mt-6 border border-border bg-secondary p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em]">What this changes</p>
      {impact.length ? <ul className="mt-2 grid gap-1 text-sm">{impact.map(i => <li key={i.option} className="flex justify-between gap-3"><span>{i.option}</span><span className="tabular-nums">{i.from.replace(/^As low as /, "")} → <b>{i.to.replace(/^As low as /, "")}</b></span></li>)}</ul>
        : <p className="mt-2 text-sm text-muted-foreground">{dirty ? "Rate tables change; no course totals change." : "No unsaved changes."}</p>}
    </div>
    <div className="mt-3"><SitePreview pages={ratePages(programs.filter(p => p.options.some(o => impact.some(i => i.option === o.name))))} state={{ rates: cleanConfig(draft) }} /></div>
    <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Note for this change (optional)" className="mt-3 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Button disabled={busy || !dirty} variant="outline" className="h-12 rounded-none" onClick={() => setDraft(saved)}>Discard changes</Button>
      <Button disabled={busy || !dirty} className="h-12 rounded-none" onClick={() => write(cleanConfig(draft), note, "Saved. The new prices are live for everyone.")}><Save /> Save</Button>
    </div>

    <h3 className="mt-8 flex items-center gap-2 font-display text-xl"><History className="size-5" /> Earlier versions</h3>
    <p className="mt-1 text-sm text-muted-foreground">Restoring a version also keeps the current one here, so you can always switch back.</p>
    <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
      {[{ id: "original", label: "Original published rates", note: null as string | null, config: {} as RatesConfig }, ...history.map(v => ({ id: v.id, label: when(v.saved_at), note: v.note, config: cleanConfig(v.config) }))].map(v => <li key={v.id} className="grid gap-3 border border-border p-3 text-sm">
        <div className={ROW}><span className="min-w-0"><span className="block">{v.label}</span>{v.note && <span className="block text-muted-foreground">{v.note}</span>}</span>
          <span className={ROW_ACTIONS}>
            <Button size="sm" variant={peek === v.id ? "secondary" : "outline"} className={`${ROW_BTN} rounded-none`} aria-expanded={peek === v.id} onClick={() => setPeek(p => (p === v.id ? null : v.id))}><Eye /> Preview</Button>
            <Button size="sm" variant="outline" disabled={busy} className={`${ROW_BTN} rounded-none`} onClick={() => write(v.config, v.id === "original" ? "Restored original published rates" : `Restored version from ${v.label}`, "That version is restored and live.")}><RotateCcw /> Restore</Button>
          </span></div>
        {peek === v.id && <SitePreview startOpen pages={ratePages(programs)} state={{ rates: v.config }} title={`Earlier prices · ${v.label} · not live`} onClose={() => setPeek(null)} />}
      </li>)}
    </ul>
    {msg && <p className="mt-4 text-sm text-muted-foreground" role="status">{msg}</p>}
  </div>;
}
