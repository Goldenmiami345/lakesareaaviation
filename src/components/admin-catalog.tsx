// Admin "Fleet & courses" tab: add airplanes, training programs and specialty courses, or hide
// them (restorable). Every change saves at once and the previous version goes to History.
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, History, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { allCourses, allPlanes, allPrograms, cleanCatalog, EMPTY_CATALOG, setHidden, type Catalog, type CatalogKind } from "@/lib/catalog";
import { applyRates, cleanConfig, rateKey, withRateDrafts, type RatesConfig } from "@/lib/rates-engine";
import { resetCatalog } from "@/lib/use-catalog";
import { resetLiveRates } from "@/lib/use-live-rates";
import { SPECIALTY_KIND_LABEL } from "@/lib/site-data";
import { addCourse, addPlane, addProgram, CourseForm, PlaneForm, ProgramForm } from "./catalog-forms";

type Version = { id: string; catalog: Json; note: string | null; saved_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function AdminCatalog() {
  const [cat, setCat] = useState<Catalog>(EMPTY_CATALOG);
  const [rates, setRates] = useState<RatesConfig>({});
  const [history, setHistory] = useState<Version[]>([]);
  const [adding, setAdding] = useState<CatalogKind | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: c }, { data: r }, { data: h }] = await Promise.all([
      supabase.from("site_catalog").select("catalog").eq("id", "current").maybeSingle(),
      supabase.from("site_rates").select("config").eq("id", "current").maybeSingle(),
      supabase.from("site_catalog_history").select("id, catalog, note, saved_at").order("replaced_at", { ascending: false }).limit(30),
    ]);
    setCat(cleanCatalog(c?.catalog)); setRates(cleanConfig(r?.config)); setHistory((h ?? []) as Version[]);
  }
  useEffect(() => { void load(); }, []);

  async function save(next: Catalog, note: string, newRates?: RatesConfig) {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("site_catalog").update({ catalog: next as unknown as Json, note }).eq("id", "current");
    const rErr = !error && newRates ? (await supabase.from("site_rates").update({ config: newRates as Json, note }).eq("id", "current")).error : null;
    if (error || rErr) setMsg((error ?? rErr)!.message);
    else { setMsg(`${note}. Saved, everyone sees it now.`); setAdding(null); resetCatalog(); if (newRates) resetLiveRates(); await load(); }
    setBusy(false);
  }
  const applied = useMemo(() => applyRates(rates), [rates]);
  const lists: { kind: CatalogKind; title: string; noun: string; items: { id: string; label: string; sub: string; hidden: boolean; added?: boolean | undefined }[] }[] = [
    { kind: "fleet", title: "Airplanes", noun: "airplane", items: allPlanes(cat, applied).map(f => ({ id: f.registration, label: `${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`, sub: `${f.name}${f.rate ? ` · ${f.rate}` : ""}`, hidden: f.hidden, added: f.added })) },
    { kind: "programs", title: "Training programs", noun: "program", items: allPrograms(cat, applied).map(p => ({ id: p.slug, label: p.name, sub: p.options[0]?.estimatedCost ?? "", hidden: p.hidden, added: p.added })) },
    { kind: "courses", title: "Specialty courses & endorsements", noun: "course", items: allCourses(cat).map(c => ({ id: c.slug, label: c.name, sub: SPECIALTY_KIND_LABEL[c.kind], hidden: c.hidden, added: c.added })) },
  ];

  return <div className="grid gap-8">
    <p className="text-sm text-muted-foreground">Tip: you can also add and hide these right on the Fleet, Programs and Specialized training pages in the visual editor.</p>
    {msg && <p className="border border-border bg-secondary px-3 py-2 text-sm" role="status">{msg}</p>}
    {lists.map(l => <section key={l.kind} className="grid gap-3">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{l.title}</h3>
        <Button size="sm" variant={adding === l.kind ? "secondary" : "default"} disabled={busy} onClick={() => setAdding(a => (a === l.kind ? null : l.kind))}><Plus className="size-4" /> Add {l.noun}</Button></div>
      {adding === l.kind && <div className="border border-primary p-4">
        {l.kind === "fleet" && <PlaneForm rates={rates} taken={cat.fleet.map(f => f.registration)} onCancel={() => setAdding(null)} onSubmit={r => void save(addPlane(cat, r), `Added ${r.plane.registration}`, r.newRow ? withRateDrafts(rates, { [rateKey.newRow(r.newRow.aircraft)]: JSON.stringify(r.newRow) }) : undefined)} />}
        {l.kind === "programs" && <ProgramForm rates={rates} taken={cat.programs.map(p => p.slug)} onCancel={() => setAdding(null)} onSubmit={p => void save(addProgram(cat, p), `Added ${p.name}`)} />}
        {l.kind === "courses" && <CourseForm taken={cat.courses.map(c => c.slug)} onCancel={() => setAdding(null)} onSubmit={c => void save(addCourse(cat, c), `Added ${c.name}`)} />}
      </div>}
      <ul className="divide-y divide-border border border-border">{l.items.map(it => <li key={it.id} className={`flex min-h-14 items-center justify-between gap-3 px-3 py-2 ${it.hidden ? "bg-secondary/60 text-muted-foreground" : ""}`}>
        <span className="min-w-0"><span className="block truncate font-semibold">{it.label}{it.added && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary-text">Added</span>}{it.hidden && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">Hidden</span>}</span><span className="block truncate text-xs text-muted-foreground">{it.sub}</span></span>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(setHidden(cat, l.kind, it.id, !it.hidden), `${it.hidden ? "Brought back" : "Hid"} ${it.label}`)}>{it.hidden ? <><Eye className="size-4" /> Bring back</> : <><EyeOff className="size-4" /> Hide</>}</Button>
      </li>)}</ul>
    </section>)}
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 font-display text-2xl"><History className="size-5" /> History</h3>
      <ul className="grid gap-2">
        <li className="flex items-center justify-between gap-3 border border-border p-3 text-sm"><span>Original fleet & courses</span><Button size="sm" variant="outline" disabled={busy} onClick={() => void save(EMPTY_CATALOG, "Restored the original fleet and courses")}><RotateCcw className="size-4" /> Restore</Button></li>
        {history.map(v => <li key={v.id} className="flex items-center justify-between gap-3 border border-border p-3 text-sm"><span className="min-w-0"><span className="block">{when(v.saved_at)}</span>{v.note && <span className="block truncate text-muted-foreground">{v.note}</span>}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(cleanCatalog(v.catalog), `Restored version from ${when(v.saved_at)}`)}><RotateCcw className="size-4" /> Restore</Button></li>)}
      </ul>
    </section>
  </div>;
}
