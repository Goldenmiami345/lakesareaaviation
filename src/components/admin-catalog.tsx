// Admin "Fleet & courses" tab: add airplanes, training programs and specialty courses, or hide
// them (restorable). Every change saves at once and the previous version goes to History.
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, History, PencilLine, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { allCourses, allPlanes, allPrograms, cleanCatalog, editPlane, EMPTY_CATALOG, originalPlane, resetPlane, setHidden, type Catalog, type CatalogKind } from "@/lib/catalog";
import { applyRates, cleanConfig, rateKey, withRateDrafts, type RatesConfig } from "@/lib/rates-engine";
import { resetCatalog } from "@/lib/use-catalog";
import { resetLiveRates } from "@/lib/use-live-rates";
import { SPECIALTY_KIND_LABEL } from "@/lib/site-data";
import { addCourse, addPlane, addProgram, CourseForm, PlaneEditForm, PlaneForm, ProgramForm } from "./catalog-forms";
import { SitePreview } from "./site-preview";
import { coursePages, planePages, programPages, type PreviewPage, type PreviewState } from "@/lib/site-preview";

type Version = { id: string; catalog: Json; note: string | null; saved_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function AdminCatalog() {
  const [cat, setCat] = useState<Catalog>(EMPTY_CATALOG);
  const [rates, setRates] = useState<RatesConfig>({});
  const [history, setHistory] = useState<Version[]>([]);
  const [adding, setAdding] = useState<CatalogKind | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  /** What the open add/edit form would publish, for the live preview under it. */
  const [draft, setDraft] = useState<{ state: PreviewState; pages: PreviewPage[] } | null>(null);

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
    else { setMsg(`${note}. Saved, everyone sees it now.`); setAdding(null); setEditing(null); resetCatalog(); if (newRates) resetLiveRates(); await load(); }
    setBusy(false);
  }
  useEffect(() => { setDraft(null); }, [adding, editing]);
  const applied = useMemo(() => applyRates(rates), [rates]);
  const startPages: Record<CatalogKind, PreviewPage[]> = { fleet: [{ label: "Fleet", path: "/fleet" }, { label: "Rates", path: "/rates" }], programs: programPages("", ""), courses: coursePages("", "") };
  const preview = (kind: CatalogKind) => <div className="mt-4"><SitePreview pages={draft?.pages ?? startPages[kind]} state={draft?.state ?? { catalog: cat }} /></div>;
  const planes = useMemo(() => allPlanes(cat, applied), [cat, applied]);
  const lists: { kind: CatalogKind; title: string; noun: string; items: { id: string; label: string; sub: string; hidden: boolean; added?: boolean | undefined }[] }[] = [
    { kind: "fleet", title: "Airplanes", noun: "airplane", items: planes.map(f => ({ id: f.registration, label: `${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`, sub: `${f.name}${f.rate ? ` · ${f.rate}` : ""}${f.edited ? " · edited" : ""}`, hidden: f.hidden, added: f.added })) },
    { kind: "programs", title: "Training programs", noun: "program", items: allPrograms(cat, applied).map(p => ({ id: p.slug, label: p.name, sub: p.options[0]?.estimatedCost ?? "", hidden: p.hidden, added: p.added })) },
    { kind: "courses", title: "Specialty courses & endorsements", noun: "course", items: allCourses(cat).map(c => ({ id: c.slug, label: c.name, sub: SPECIALTY_KIND_LABEL[c.kind], hidden: c.hidden, added: c.added })) },
  ];

  return <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
    <p className="text-sm text-muted-foreground">Tip: you can also add, hide and edit these right on the Fleet, Programs and Specialized training pages in the visual editor.</p>
    {msg && <p className="border border-border bg-secondary px-3 py-2 text-sm" role="status">{msg}</p>}
    {lists.map(l => <section key={l.kind} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{l.title}</h3>
        <Button size="sm" variant={adding === l.kind ? "secondary" : "default"} disabled={busy} onClick={() => setAdding(a => (a === l.kind ? null : l.kind))}><Plus className="size-4" /> Add {l.noun}</Button></div>
      {adding === l.kind && <div className="border border-primary p-3 sm:p-4">
        {l.kind === "fleet" && <PlaneForm rates={rates} taken={cat.fleet.map(f => f.registration)} onCancel={() => setAdding(null)}
          onDraft={r => setDraft(r ? { state: { catalog: addPlane(cat, r), ...(r.newRow ? { rates: withRateDrafts(rates, { [rateKey.newRow(r.newRow.aircraft)]: JSON.stringify(r.newRow) }) } : {}) }, pages: planePages(r.plane.registration, r.plane.registration) } : null)} onSubmit={r => void save(addPlane(cat, r), `Added ${r.plane.registration}`, r.newRow ? withRateDrafts(rates, { [rateKey.newRow(r.newRow.aircraft)]: JSON.stringify(r.newRow) }) : undefined)} />}
        {l.kind === "programs" && <ProgramForm rates={rates} taken={cat.programs.map(p => p.slug)} onCancel={() => setAdding(null)}
          onDraft={p => setDraft(p ? { state: { catalog: addProgram(cat, p) }, pages: programPages(p.slug, p.name) } : null)} onSubmit={p => void save(addProgram(cat, p), `Added ${p.name}`)} />}
        {l.kind === "courses" && <CourseForm taken={cat.courses.map(c => c.slug)} onCancel={() => setAdding(null)}
          onDraft={c => setDraft(c ? { state: { catalog: addCourse(cat, c) }, pages: coursePages(c.slug, c.name) } : null)} onSubmit={c => void save(addCourse(cat, c), `Added ${c.name}`)} />}
        {preview(l.kind)}
      </div>}
      <ul className="divide-y divide-border border border-border">{l.items.map(it => <li key={it.id} className={it.hidden ? "bg-secondary/60 text-muted-foreground" : ""}><div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
        <span className="min-w-0"><span className="block truncate font-semibold">{it.label}{it.added && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary-text">Added</span>}{it.hidden && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">Hidden</span>}</span><span className="block truncate text-xs text-muted-foreground">{it.sub}</span></span>
        <span className="flex shrink-0 flex-wrap justify-end gap-2">
          {l.kind === "fleet" && <Button size="sm" variant={editing === it.id ? "secondary" : "outline"} disabled={busy} aria-expanded={editing === it.id} onClick={() => setEditing(e => (e === it.id ? null : it.id))}><PencilLine className="size-4" /> Edit</Button>}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(setHidden(cat, l.kind, it.id, !it.hidden), `${it.hidden ? "Brought back" : "Hid"} ${it.label}`)}>{it.hidden ? <><Eye className="size-4" /> Bring back</> : <><EyeOff className="size-4" /> Hide</>}</Button>
        </span></div>
        {l.kind === "fleet" && editing === it.id && (() => {
          const plane = planes.find(p => p.registration === it.id); const original = originalPlane(cat, it.id);
          return plane && original ? <div className="border-t border-primary p-4 text-foreground">
            <PlaneEditForm plane={plane} original={original} rates={rates} onCancel={() => setEditing(null)}
              onReset={() => void save(resetPlane(cat, it.id), `Put ${it.label} back to the original`)}
              onSave={f => void save(editPlane(cat, it.id, f), `Edited ${it.label}`)}
              onDraft={f => setDraft({ state: { catalog: editPlane(cat, it.id, f) }, pages: planePages(it.id, it.label) })} />
            {preview("fleet")}
          </div> : null;
        })()}
      </li>)}</ul>
    </section>)}
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <h3 className="flex items-center gap-2 font-display text-2xl"><History className="size-5" /> History</h3>
      <ul className="grid gap-2">
        <li className="flex items-center justify-between gap-3 border border-border p-3 text-sm"><span>Original fleet & courses</span><Button size="sm" variant="outline" disabled={busy} onClick={() => void save(EMPTY_CATALOG, "Restored the original fleet and courses")}><RotateCcw className="size-4" /> Restore</Button></li>
        {history.map(v => <li key={v.id} className="flex items-center justify-between gap-3 border border-border p-3 text-sm"><span className="min-w-0"><span className="block">{when(v.saved_at)}</span>{v.note && <span className="block truncate text-muted-foreground">{v.note}</span>}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(cleanCatalog(v.catalog), `Restored version from ${when(v.saved_at)}`)}><RotateCcw className="size-4" /> Restore</Button></li>)}
      </ul>
    </section>
  </div>;
}
