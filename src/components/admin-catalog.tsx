// Admin "Fleet & courses" tab: add airplanes, training programs and specialty courses, edit them,
// or hide them (restorable). Every change saves at once and the previous version goes to History.
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, History, PencilLine, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { allCourses, allPlanes, allPrograms, cleanCatalog, editPlane, EMPTY_CATALOG, originalPlane, planePriceChange, resetPlane, setCoursePricing, setHidden, type Catalog, type CatalogKind, type PlaneFields, type PlanePrice } from "@/lib/catalog";
import { applyRates, cleanConfig, rateKey, withRateDrafts, type RatesConfig } from "@/lib/rates-engine";
import { resetCatalog } from "@/lib/use-catalog";
import { resetLiveRates } from "@/lib/use-live-rates";
import { programs as basePrograms, SPECIALTY_KIND_LABEL } from "@/lib/site-data";
import { addCourse, addPlane, addProgram, CourseForm, CoursePricingForm, PlaneEditForm, PlaneForm, ProgramForm, PublishedProgramForm } from "./catalog-forms";
import { SitePreview } from "./site-preview";
import { coursePages, planePages, programPages, type PreviewPage, type PreviewState } from "@/lib/site-preview";

type Version = { id: string; catalog: Json; note: string | null; saved_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const ALL_PAGES: PreviewPage[] = [{ label: "Fleet", path: "/fleet" }, { label: "Programs", path: "/programs" }, { label: "Specialized training", path: "/specialized-training" }, { label: "Rates", path: "/rates" }];

export function AdminCatalog() {
  const [cat, setCat] = useState<Catalog>(EMPTY_CATALOG);
  const [rates, setRates] = useState<RatesConfig>({});
  const [history, setHistory] = useState<Version[]>([]);
  const [adding, setAdding] = useState<CatalogKind | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
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
  // The saved/failed note floats at the bottom of the screen, so the list never jumps when it appears.
  useEffect(() => { if (!msg) return; const t = window.setTimeout(() => setMsg(null), msg.error ? 8000 : 4000); return () => window.clearTimeout(t); }, [msg]);

  /** Saves fleet & courses and/or prices. The list shows the change at once; a failure puts it back. */
  async function save(next: { catalog?: Catalog; rates?: RatesConfig | undefined }, note: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const before = { cat, rates };
    if (next.catalog) setCat(next.catalog);
    if (next.rates) setRates(next.rates);
    const error = (next.catalog ? (await supabase.from("site_catalog").update({ catalog: next.catalog as unknown as Json, note }).eq("id", "current")).error : null)
      ?? (next.rates ? (await supabase.from("site_rates").update({ config: next.rates as Json, note }).eq("id", "current")).error : null);
    if (error) { setCat(before.cat); setRates(before.rates); setMsg({ text: `Not saved: ${error.message}`, error: true }); }
    else { setMsg({ text: `${note}. Saved, everyone sees it now.` }); setAdding(null); setEditing(null); resetCatalog(); if (next.rates) resetLiveRates(); await load(); }
    busyRef.current = false; setBusy(false);
  }
  useEffect(() => { setDraft(null); }, [adding, editing]);
  const applied = useMemo(() => applyRates(rates), [rates]);
  const startPages: Record<CatalogKind, PreviewPage[]> = { fleet: [{ label: "Fleet", path: "/fleet" }, { label: "Rates", path: "/rates" }], programs: programPages("", ""), courses: coursePages("", "") };
  const preview = (kind: CatalogKind) => <div className="mt-4"><SitePreview pages={draft?.pages ?? startPages[kind]} state={draft?.state ?? { catalog: cat }} /></div>;
  const planes = useMemo(() => allPlanes(cat, applied), [cat, applied]);
  const courses = useMemo(() => allCourses(cat, applied), [cat, applied]);
  const lists: { kind: CatalogKind; title: string; noun: string; items: { id: string; label: string; sub: string; hidden: boolean; added?: boolean | undefined }[] }[] = [
    { kind: "fleet", title: "Airplanes", noun: "airplane", items: planes.map(f => ({ id: f.registration, label: `${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}`, sub: `${f.name}${f.rate ? ` · ${f.rate}` : ""}${f.edited ? " · edited" : ""}`, hidden: f.hidden, added: f.added })) },
    { kind: "programs", title: "Training programs", noun: "program", items: allPrograms(cat, applied).map(p => ({ id: p.slug, label: p.name, sub: p.options.map(o => o.estimatedCost).join(" · "), hidden: p.hidden, added: p.added })) },
    { kind: "courses", title: "Specialty courses & endorsements", noun: "course", items: courses.map(c => ({ id: c.slug, label: c.name, sub: `${SPECIALTY_KIND_LABEL[c.kind]}${c.price ? ` · ${c.price.estimatedCost}` : " · no price yet"}`, hidden: c.hidden, added: c.added })) },
  ];

  /** The edit panel under one row. */
  function editor(kind: CatalogKind, id: string, label: string) {
    if (kind === "fleet") {
      const plane = planes.find(p => p.registration === id); const original = originalPlane(cat, id);
      if (!plane || !original) return null;
      const priced = (f: PlaneFields, price?: PlanePrice) => {
        const ch = price ? planePriceChange(cat, applied, id, f.rateRow, price) : null;
        const nextRates = ch && Object.keys(ch.drafts).length ? withRateDrafts(rates, ch.drafts) : undefined;
        return { catalog: editPlane(cat, id, { ...f, rateRow: ch?.rateRow ?? f.rateRow }), rates: nextRates };
      };
      return <><PlaneEditForm plane={plane} original={original} rates={rates} planes={planes} onCancel={() => setEditing(null)}
        onReset={() => void save({ catalog: resetPlane(cat, id) }, `Put ${label} back to the original`)}
        onSave={(f, price) => void save(priced(f, price), `Edited ${label}`)}
        onDraft={(f, price) => { const n = priced(f, price); setDraft({ state: { catalog: n.catalog, ...(n.rates ? { rates: n.rates } : {}) }, pages: planePages(id, label) }); }} />
        {preview("fleet")}</>;
    }
    if (kind === "programs") {
      const added = cat.programs.find(p => p.slug === id);
      const pages = [...programPages(id, label), { label: "Rates", path: "/rates" }];
      if (added) return <><ProgramForm initial={added} rates={rates} taken={[]} onCancel={() => setEditing(null)}
        onDraft={p => setDraft(p ? { state: { catalog: addProgram(cat, p) }, pages } : null)} onSubmit={p => void save({ catalog: addProgram(cat, p) }, `Edited ${p.name}`)} />{preview("programs")}</>;
      const base = basePrograms.find(p => p.slug === id);
      if (!base) return null;
      return <><PublishedProgramForm program={base} rates={rates} onCancel={() => setEditing(null)}
        onDraft={d => setDraft({ state: { rates: withRateDrafts(rates, d) }, pages })} onSave={d => void save({ rates: withRateDrafts(rates, d) }, `Edited ${label}`)} />{preview("programs")}</>;
    }
    return <><CoursePricingForm slug={id} pricing={cat.coursePricing?.[id]} rates={rates} onCancel={() => setEditing(null)}
      onDraft={p => setDraft({ state: { catalog: setCoursePricing(cat, id, p) }, pages: coursePages(id, label) })}
      onSave={p => void save({ catalog: setCoursePricing(cat, id, p) }, p ? `Priced ${label}` : `Removed the price of ${label}`)} />{preview("courses")}</>;
  }

  const versions: { id: string; label: string; note?: string | null | undefined; catalog: Catalog }[] = [
    { id: "original", label: "Original fleet & courses", catalog: EMPTY_CATALOG },
    ...history.map(v => ({ id: v.id, label: when(v.saved_at), note: v.note, catalog: cleanCatalog(v.catalog) })),
  ];

  return <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
    <p className="text-sm text-muted-foreground">Tip: you can also add, hide and edit these right on the Fleet, Programs and Specialized training pages in the visual editor.</p>
    {msg && <p role="status" className={`fixed inset-x-4 bottom-4 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] border px-4 py-3 text-sm shadow-xl ${msg.error ? "border-destructive bg-background text-destructive" : "border-border bg-ink text-background"}`}>{msg.text}</p>}
    {lists.map(l => <section key={l.kind} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">{l.title}</h3>
        <Button size="sm" variant={adding === l.kind ? "secondary" : "default"} onClick={() => setAdding(a => (a === l.kind ? null : l.kind))}><Plus className="size-4" /> Add {l.noun}</Button></div>
      {adding === l.kind && <div className="border border-primary p-3 sm:p-4">
        {l.kind === "fleet" && <PlaneForm rates={rates} taken={cat.fleet.map(f => f.registration)} onCancel={() => setAdding(null)}
          onDraft={r => setDraft(r ? { state: { catalog: addPlane(cat, r), ...(r.newRow ? { rates: withRateDrafts(rates, { [rateKey.newRow(r.newRow.aircraft)]: JSON.stringify(r.newRow) }) } : {}) }, pages: planePages(r.plane.registration, r.plane.registration) } : null)} onSubmit={r => void save({ catalog: addPlane(cat, r), rates: r.newRow ? withRateDrafts(rates, { [rateKey.newRow(r.newRow.aircraft)]: JSON.stringify(r.newRow) }) : undefined }, `Added ${r.plane.registration}`)} />}
        {l.kind === "programs" && <ProgramForm rates={rates} taken={cat.programs.map(p => p.slug)} onCancel={() => setAdding(null)}
          onDraft={p => setDraft(p ? { state: { catalog: addProgram(cat, p) }, pages: programPages(p.slug, p.name) } : null)} onSubmit={p => void save({ catalog: addProgram(cat, p) }, `Added ${p.name}`)} />}
        {l.kind === "courses" && <CourseForm taken={cat.courses.map(c => c.slug)} onCancel={() => setAdding(null)}
          onDraft={c => setDraft(c ? { state: { catalog: addCourse(cat, c) }, pages: coursePages(c.slug, c.name) } : null)} onSubmit={c => void save({ catalog: addCourse(cat, c) }, `Added ${c.name}`)} />}
        {preview(l.kind)}
      </div>}
      <ul className="divide-y divide-border border border-border">{l.items.map(it => { const key = `${l.kind}:${it.id}`; return <li key={it.id} className={it.hidden ? "bg-secondary/60 text-muted-foreground" : ""}><div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
        <span className="min-w-0"><span className="block font-semibold">{it.label}{it.added && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary-text">Added</span>}{it.hidden && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">Hidden</span>}</span><span className="block text-xs text-muted-foreground">{it.sub}</span></span>
        <span className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button size="sm" variant={editing === key ? "secondary" : "outline"} aria-expanded={editing === key} onClick={() => setEditing(e => (e === key ? null : key))}><PencilLine className="size-4" /> {l.kind === "courses" ? "Price" : "Edit"}</Button>
          <Button size="sm" variant="outline" className="min-w-[7.5rem]" aria-busy={busy || undefined} onClick={() => void save({ catalog: setHidden(cat, l.kind, it.id, !it.hidden) }, `${it.hidden ? "Brought back" : "Hid"} ${it.label}`)}>{it.hidden ? <><Eye className="size-4" /> Bring back</> : <><EyeOff className="size-4" /> Hide</>}</Button>
        </span></div>
        {editing === key && <div className="border-t border-primary p-3 text-foreground sm:p-4">{editor(l.kind, it.id, it.label)}</div>}
      </li>; })}</ul>
    </section>)}
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <h3 className="flex items-center gap-2 font-display text-2xl"><History className="size-5" /> History</h3>
      <p className="text-sm text-muted-foreground">Preview any earlier version on the site before restoring it. Restoring keeps the current version here too.</p>
      <ul className="grid gap-2">{versions.map(v => <li key={v.id} className="grid gap-3 border border-border p-3 text-sm">
        <div className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block">{v.label}</span>{v.note && <span className="block text-muted-foreground">{v.note}</span>}</span>
          <span className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button size="sm" variant={peek === v.id ? "secondary" : "outline"} aria-expanded={peek === v.id} onClick={() => setPeek(p => (p === v.id ? null : v.id))}><Eye className="size-4" /> Preview</Button>
            <Button size="sm" variant="outline" onClick={() => void save({ catalog: v.catalog }, v.id === "original" ? "Restored the original fleet and courses" : `Restored version from ${v.label}`)}><RotateCcw className="size-4" /> Restore</Button>
          </span></div>
        {peek === v.id && <SitePreview startOpen pages={ALL_PAGES} state={{ catalog: v.catalog }} title={`Earlier version · ${v.label} · not live`} onClose={() => setPeek(null)} />}
      </li>)}</ul>
    </section>
  </div>;
}
