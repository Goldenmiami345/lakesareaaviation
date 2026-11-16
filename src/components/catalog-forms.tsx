// Add-a-plane / add-a-program / add-a-course forms, shared by the admin "Fleet & courses" tab and
// the visual editor's "+ Add" tiles. They only produce data; the caller decides where it is saved.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ImageUp, Loader2, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { allPlanes, buildProgram, editPlane, fieldsOf, originalPlane, planePriceChange, PLANE_LIMITS, priceBlocks, REG, resetPlane, slugify, type CoursePricing, type PlaneFields, type PlanePrice, type AddedCourse, type AddedPlane, type AddedProgram, type Catalog, type ProgramBlock } from "@/lib/catalog";
import { aircraftChoicesFor, applyRates, numOf, parseFee, parseLine, pricedWith, rateKey, withRateDrafts, type AppliedRates, type ExtraRental, type RatesConfig } from "@/lib/rates-engine";
import { editStore, useEditState } from "@/lib/edit-store";
import { useCatalog } from "@/lib/use-catalog";
import type { Plane } from "@/lib/catalog";
import { fleet as baseFleet, programs as basePrograms, specialtyCourses, SPECIALTY_KIND_LABEL, type FleetRole, type Program, type SpecialtyKind } from "@/lib/site-data";
import { uploadSlotPhoto } from "@/lib/media-upload";

const field = "grid gap-1.5 text-sm font-semibold";
const hint = "text-xs font-normal text-muted-foreground";
const select = "h-10 w-full border border-input bg-background px-3 text-sm font-normal";
/** Airplane and rate names are long: size these to their own text (never w-full, which clips them).
 *  The caller sets justify-self (start = as wide as the name, stretch = the full row on phones). */
const selectFit = "h-10 w-auto max-w-full min-w-0 border border-input bg-background px-2 text-[13px] font-normal sm:px-3 sm:text-sm";
const priceHint = "Prices are regular / prepay per hour.";
const Field = ({ label, note, children }: { label: string; note?: string; children: ReactNode }) => <label className={field}>{label}{children}{note && <span className={hint}>{note}</span>}</label>;
const linesOf = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean);
const money = (s: string) => s.replace(/[^\d.]/g, "");

/** A fold-away group in a long form; when closed, a one-line summary says what is inside. */
function Section({ title, summary, open = false, children }: { title: string; summary?: ReactNode; open?: boolean; children: ReactNode }) {
  return <details open={open} className="group border border-border bg-background">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 sm:px-4 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[0.14em]">{title}</span>{summary && <span className="mt-0.5 block text-xs text-muted-foreground group-open:hidden">{summary}</span>}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="grid gap-4 border-t border-border p-3 sm:p-4">{children}</div>
  </details>;
}

/** Save/Cancel pinned to the top of a form (below the admin bar), so long forms never need a
 *  scroll to the bottom. The bottom Footer stays too. */
function TopActions({ errors, onCancel, onSubmit, label, icon }: { errors: string[]; onCancel?: (() => void) | undefined; onSubmit: () => void; label: string; icon: ReactNode }) {
  return <div className="sticky z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-b border-border bg-background px-1 py-2" style={{ top: "var(--form-sticky-top, 0px)" }}>
    {errors.length > 0 && <span className="mr-auto min-w-0 text-xs text-destructive">{errors.length === 1 ? errors[0] : `${errors.length} things to fix, listed at the bottom.`}</span>}
    {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
    <Button type="button" size="sm" disabled={errors.length > 0} onClick={onSubmit}>{icon} {label}</Button>
  </div>;
}

function PhotoPick({ id, value, onChange, label = "Photo", note = "Use a real photo of this airplane or course. It is resized for the web automatically.", extra }: { id: string; value: string; onChange: (url: string) => void; label?: string; note?: string; extra?: ReactNode }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  return <div className={field}>{label}
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-16 w-24 border border-border object-cover" /> : <div className="grid h-16 w-24 place-items-center border border-dashed border-border text-muted-foreground"><ImageUp className="size-5" /></div>}
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-input px-3 text-sm font-semibold hover:bg-secondary">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />} {value ? "Replace photo" : "Upload photo"}
        <input type="file" accept="image/*" className="sr-only" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); setErr(""); try { onChange(await uploadSlotPhoto(id, f)); } catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); } setBusy(false); e.target.value = ""; }} />
      </label>
      {extra}
    </div>
    {err && <span className="text-xs text-destructive">{err}</span>}
    {note && <span className={hint}>{note}</span>}
  </div>;
}

export type PlaneResult = { plane: AddedPlane; newRow?: ExtraRental };
/** Rental lines a new airplane can share, from the live rates. */
export function PlaneForm({ rates, taken, onSubmit, onCancel, onDraft }: { rates: RatesConfig; taken: string[]; onSubmit: (r: PlaneResult) => void; onCancel?: () => void; onDraft?: (r: PlaneResult | null) => void }) {
  const applied = useMemo(() => applyRates(rates), [rates]);
  const [f, setF] = useState({ registration: "", name: "", nickname: "", role: "trainer" as FleetRole, use: "", note: "", photo: "", year: "", hp: "", seats: "", avionics: "" });
  const [price, setPrice] = useState<"share" | "new" | "none">("share");
  const [row, setRow] = useState(applied.rentalRates[0]?.aircraft ?? "");
  const [nr, setNr] = useState({ aircraft: "", regular: "", prepay: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  const reg = f.registration.trim().toUpperCase();
  const lineName = nr.aircraft.trim() || f.name.replace(/^\d{4}\s+/, "").trim();
  const errors = [
    !REG.test(reg) && "Tail number must look like N12345.",
    (taken.includes(reg) || baseFleet.some(p => p.registration === reg)) && "That tail number is already in the fleet.",
    !f.name.trim() && "Add the airplane name, for example 1975 Cessna 172M.",
    !f.photo && "Upload a photo of the airplane.",
    price === "new" && (!lineName || !(Number(nr.regular) > 0) || !(Number(nr.prepay) > 0)) && "Give the new rate line a name and both prices.",
    price === "new" && applied.rentalRates.some(r => r.aircraft === lineName) && "A rate line with that name already exists. Share it instead.",
  ].filter(Boolean) as string[];
  const build = (): PlaneResult => {
    const specs: Record<string, string> = {};
    if (f.year.trim()) specs["Year"] = f.year.trim(); if (f.hp.trim()) specs["Horsepower"] = f.hp.trim(); if (f.seats.trim()) specs["Seats"] = f.seats.trim(); if (f.avionics.trim()) specs["GPS"] = f.avionics.trim();
    const rateRow = price === "share" ? row : price === "new" ? lineName : undefined;
    const plane: AddedPlane = { registration: reg, name: f.name.trim(), role: f.role, use: f.use.trim() || "Flight training", note: f.note.trim(), photo: f.photo, specs, ...(f.nickname.trim() ? { nickname: f.nickname.trim() } : {}), ...(rateRow ? { rateRow } : {}) };
    return { plane, ...(price === "new" ? { newRow: { aircraft: lineName, names: f.nickname.trim() ? `“${f.nickname.trim()}”` : reg, regular: Number(nr.regular), prepay: Number(nr.prepay) } } : {}) };
  };
  const submit = () => onSubmit(build());
  // Live preview: the airplane as it would look, once it has a valid tail number and a name.
  useEffect(() => { onDraft?.(REG.test(reg) && f.name.trim() ? build() : null); }, [f, price, row, nr]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="grid gap-4">
    <TopActions errors={errors} onCancel={onCancel} onSubmit={submit} label="Add airplane" icon={<Plus className="size-4" />} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tail number"><Input value={f.registration} onChange={set("registration")} placeholder="N12345" autoCapitalize="characters" /></Field>
      <Field label="Nickname" note="Optional"><Input value={f.nickname} onChange={set("nickname")} placeholder="Robin" /></Field>
    </div>
    <Field label="Airplane"><Input value={f.name} onChange={set("name")} placeholder="1975 Cessna 172M" /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Type"><select className={select} value={f.role} onChange={set("role")}><option value="trainer">Trainer</option><option value="twin">Twin</option><option value="tailwheel">Tailwheel</option></select></Field>
      <Field label="Used for"><Input value={f.use} onChange={set("use")} placeholder="Primary · Instrument · Commercial" /></Field>
    </div>
    <Field label="Short note" note="One sentence shown on the fleet card."><Textarea rows={2} value={f.note} onChange={set("note")} /></Field>
    <PhotoPick id={`fleet.${reg || "new"}.photo`} value={f.photo} onChange={photo => setF(v => ({ ...v, photo }))} />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Field label="Year"><Input value={f.year} onChange={set("year")} inputMode="numeric" /></Field>
      <Field label="HP"><Input value={f.hp} onChange={set("hp")} inputMode="numeric" /></Field>
      <Field label="Seats"><Input value={f.seats} onChange={set("seats")} inputMode="numeric" /></Field>
      <Field label="Avionics"><Input value={f.avionics} onChange={set("avionics")} /></Field>
    </div>
    <fieldset className="grid gap-2 border border-border p-2 text-sm sm:p-3">
      <legend className="px-1 font-semibold">Hourly price</legend>
      <label className="flex items-center gap-2"><input type="radio" checked={price === "share"} onChange={() => setPrice("share")} /> Same price as an existing rate line</label>
      {price === "share" && <select className={`${selectFit} justify-self-start`} value={row} onChange={e => setRow(e.target.value)}>{applied.rentalRates.map(r => <option key={r.aircraft} value={r.aircraft}>{r.aircraft}</option>)}</select>}
      {price === "share" && <span className={hint}>{(() => { const s = applied.rentalRates.find(r => r.aircraft === row); return s ? `Regular ${s.regular} / prepay ${s.prepay} per hour.` : priceHint; })()}</span>}
      <label className="flex items-center gap-2"><input type="radio" checked={price === "new"} onChange={() => setPrice("new")} /> Its own new rate line</label>
      {price === "new" && <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Rate line name"><Input value={nr.aircraft} onChange={e => setNr(v => ({ ...v, aircraft: e.target.value }))} placeholder={f.name.replace(/^\d{4}\s+/, "") || "Cessna 172M"} /></Field>
        <Field label="Regular $/hr"><Input value={nr.regular} onChange={e => setNr(v => ({ ...v, regular: e.target.value.replace(/[^\d.]/g, "") }))} inputMode="decimal" /></Field>
        <Field label="Prepay $/hr"><Input value={nr.prepay} onChange={e => setNr(v => ({ ...v, prepay: e.target.value.replace(/[^\d.]/g, "") }))} inputMode="decimal" /></Field>
      </div>}
      <label className="flex items-center gap-2"><input type="radio" checked={price === "none"} onChange={() => setPrice("none")} /> No published price (visitors are asked to call)</label>
    </fieldset>
    <Footer errors={errors} onCancel={onCancel} onSubmit={submit} label="Add airplane" />
  </div>;
}

/** Hours of rental and instruction, each priced from the Rates table. Shared by programs and courses. */
function BlocksEditor({ blocks, setBlocks, applied, defaultAircraft }: { blocks: ProgramBlock[]; setBlocks: (f: (b: ProgramBlock[]) => ProgramBlock[]) => void; applied: AppliedRates; defaultAircraft: string }) {
  const firstInstr = applied.instructionRates[0]?.label ?? "";
  const upd = (i: number, b: Partial<ProgramBlock> & { what?: ProgramBlock["what"] }) => setBlocks(list => list.map((x, j) => {
    if (j !== i) return x;
    const what = b.what ?? x.what; const hours = b.hours ?? x.hours;
    if (what === "rental") return { hours, what, aircraft: ("aircraft" in b && b.aircraft) || (x.what === "rental" ? x.aircraft : defaultAircraft) };
    return { hours, what, instruction: ("instruction" in b && b.instruction) || (x.what !== "rental" ? x.instruction : firstInstr) };
  }));
  return <>
    {blocks.map((b, i) => {
      const rLine = b.what === "rental" ? applied.rentalRates.find(r => r.aircraft === b.aircraft) : undefined;
      const iLine = b.what === "rental" ? undefined : applied.instructionRates.find(r => r.label === b.instruction);
      const line = rLine ? `${rLine.aircraft} · ${rLine.prepay}/hr prepay` : iLine ? `${iLine.label} · ${iLine.rate}/hr` : "";
      return <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[4.5rem_auto_minmax(0,1fr)_auto] sm:items-center">
        <Input aria-label="Hours" placeholder="0" className="col-start-1 row-start-1" value={b.hours || ""} onChange={e => upd(i, { hours: Number(money(e.target.value)) || 0 })} inputMode="decimal" />
        <button type="button" aria-label="Remove line" onClick={() => setBlocks(l => l.filter((_, j) => j !== i))} className="col-start-2 row-start-1 grid size-10 place-items-center text-muted-foreground hover:text-destructive sm:col-start-4"><Trash2 className="size-4" /></button>
        <select aria-label="Kind" className={`${select} col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1`} value={b.what} onChange={e => upd(i, { what: e.target.value as ProgramBlock["what"] })}><option value="rental">hrs rental</option><option value="flight">hrs flight instr.</option><option value="ground">hrs ground instr.</option></select>
        {b.what === "rental"
          ? <select aria-label="Aircraft" className={`${selectFit} col-span-2 row-start-3 justify-self-stretch sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-self-start`} value={b.aircraft} onChange={e => upd(i, { aircraft: e.target.value } as Partial<ProgramBlock>)}>{applied.rentalRates.map(r => <option key={r.aircraft} value={r.aircraft}>{r.aircraft}</option>)}</select>
          : <select aria-label="Instruction rate" className={`${selectFit} col-span-2 row-start-3 justify-self-stretch sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-self-start`} value={b.instruction} onChange={e => upd(i, { instruction: e.target.value } as Partial<ProgramBlock>)}>{applied.instructionRates.map(r => <option key={r.label} value={r.label}>{r.short}</option>)}</select>}
        {line && <p className="col-span-2 row-start-4 text-xs text-muted-foreground sm:col-span-4 sm:row-start-2">{line}</p>}
      </div>;
    })}
    <div className="flex flex-wrap gap-x-4">
      <button type="button" onClick={() => setBlocks(l => [...l, { hours: 0, what: "rental", aircraft: defaultAircraft }])} className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-primary-text"><Plus className="size-4" /> Airplane hours</button>
      <button type="button" onClick={() => setBlocks(l => [...l, { hours: 0, what: "flight", instruction: firstInstr }])} className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-primary-text"><Plus className="size-4" /> Instruction hours</button>
    </div>
  </>;
}
function CostPreview({ items, total }: { items: string[]; total: string }) {
  return <div className="mt-1 border-t border-border pt-3">
    {items.length ? <ul className="grid gap-1 text-xs text-muted-foreground">{items.map(l => <li key={l}>{l}</li>)}</ul> : <p className={hint}>Add hours to work out a price.</p>}
    <p className="mt-2 font-bold">{total}</p>
    <p className={hint}>Worked out from the Rates table (airplanes at the prepay rate), so a rate change updates this too.</p>
  </div>;
}

/** A training program priced from hours: course fee + aircraft rental + instruction, all from the rates.
 *  With `initial` it edits an added program (its web address stays the same). */
export function ProgramForm({ rates, taken, onSubmit, onCancel, onDraft, initial }: { rates: RatesConfig; taken: string[]; onSubmit: (p: AddedProgram) => void; onCancel?: () => void; onDraft?: (p: AddedProgram | null) => void; initial?: AddedProgram }) {
  const applied = useMemo(() => applyRates(rates), [rates]);
  const [f, setF] = useState(() => initial
    ? { name: initial.name, short: initial.short, description: initial.description, timeline: initial.timeline, fee: String(initial.fee), requirements: initial.requirements.join("\n"), notes: initial.notes.join("\n") }
    : { name: "", short: "", description: "", timeline: "", fee: "500", requirements: "", notes: "Examiner fees are additional and aircraft rental is subject to tax." });
  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => initial ? initial.blocks : [
    { hours: 10, what: "rental", aircraft: "Cessna 172" },
    { hours: 10, what: "flight", instruction: applied.instructionRates[0]?.label ?? "" },
    { hours: 5, what: "ground", instruction: applied.instructionRates[0]?.label ?? "" },
  ]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  const slug = initial?.slug ?? slugify(f.name);
  const draft: AddedProgram = { slug, name: f.name.trim(), short: f.short.trim() || f.name.trim(), description: f.description.trim(), timeline: f.timeline.trim() || "Custom", fee: Number(f.fee) || 0, blocks: blocks.filter(b => b.hours > 0), requirements: linesOf(f.requirements), notes: linesOf(f.notes) };
  const preview = buildProgram(draft, applied).options[0]!;
  useEffect(() => { onDraft?.(slug ? draft : null); }, [f, blocks]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = [!f.name.trim() && "Add the program name.", !initial && slug && (taken.includes(slug) || basePrograms.some(p => p.slug === slug)) && "A program with that name already exists."].filter(Boolean) as string[];
  const label = initial ? "Save changes" : "Add program";
  const icon = initial ? <Save className="size-4" /> : <Plus className="size-4" />;
  return <div className="grid gap-4">
    <TopActions errors={errors} onCancel={onCancel} onSubmit={() => onSubmit(draft)} label={label} icon={icon} />
    <Section title="Basics" open summary={[f.name, f.timeline].filter(Boolean).join(" · ") || "Name, tagline, timeline"}>
      <Field label="Program name"><Input value={f.name} onChange={set("name")} placeholder="Commercial Glider Add-On" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Short tagline"><Input value={f.short} onChange={set("short")} placeholder="Add a rating" /></Field>
        <Field label="Timeline"><Input value={f.timeline} onChange={set("timeline")} placeholder="5–7 days" /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={f.description} onChange={set("description")} /></Field>
    </Section>
    <Section title="Hours & price" open={!initial} summary={`${draft.blocks.map(b => `${b.hours} h ${b.what === "rental" ? b.aircraft : b.what}`).join(", ") || "No hours yet"} · ${preview.estimatedCost}`}>
      <Field label="Course fee $"><Input value={f.fee} onChange={e => setF(v => ({ ...v, fee: e.target.value.replace(/[^\d]/g, "") }))} inputMode="numeric" className="max-w-32" /></Field>
      <BlocksEditor blocks={blocks} setBlocks={setBlocks} applied={applied} defaultAircraft="Cessna 172" />
      <CostPreview items={preview.lineItems} total={preview.estimatedCost} />
    </Section>
    <Section title="Requirements & notes" summary={`${linesOf(f.requirements).length} requirement(s), ${linesOf(f.notes).length} note(s)`}>
      <Field label="Before you begin" note="One per line."><Textarea rows={2} value={f.requirements} onChange={set("requirements")} /></Field>
      <Field label="Cost notes" note="One per line."><Textarea rows={2} value={f.notes} onChange={set("notes")} /></Field>
    </Section>
    <Footer errors={errors} onCancel={onCancel} onSubmit={() => onSubmit(draft)} label={label} icon={icon} />
  </div>;
}

/** Hours, course fee and airplane of a published program. Saves as rate edits (rateKey -> value),
 *  so the published wording stays and only the worked-out figures move. */
export function PublishedProgramForm({ program, rates, onSave, onCancel, onDraft }: { program: Program; rates: RatesConfig; onSave: (drafts: Record<string, string>) => void; onCancel?: () => void; onDraft?: (drafts: Record<string, string>) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const before = useMemo(() => applyRates(rates), [rates]);
  const after = useMemo(() => applyRates(withRateDrafts(rates, drafts)), [rates, drafts]);
  useEffect(() => { onDraft?.(drafts); }, [drafts]); // eslint-disable-line react-hooks/exhaustive-deps
  const put = (k: string, v: string) => setDrafts(d => ({ ...d, [k]: v }));
  const live = after.programs.find(p => p.slug === program.slug) ?? program;
  const worked = program.options.some(o => o.lineItems.some(l => parseLine(l)));
  const changed = JSON.stringify(withRateDrafts(rates, drafts)) !== JSON.stringify(withRateDrafts(rates, {}));
  const errors = changed ? [] : ["No changes yet."];
  const save = () => onSave(drafts);
  if (!worked) return <div className="grid gap-3 text-sm"><p>This program's estimate is a published summary, not worked out from hours. Change its words in the visual editor.</p>{onCancel && <Button type="button" variant="ghost" className="justify-self-end" onClick={onCancel}>Close</Button>}</div>;
  return <div className="grid gap-4">
    <TopActions errors={errors} onCancel={onCancel} onSubmit={save} label="Save changes" icon={<Save className="size-4" />} />
    {program.options.map((o, j) => {
      const lo = live.options[j] ?? o;
      const choices = aircraftChoicesFor(o.lineItems, after.config.extraRental);
      const plane = pricedWith(after, o.name, o.lineItems);
      const was = before.programs.find(p => p.slug === program.slug)?.options[j]?.estimatedCost;
      return <Section key={o.name} title={o.name} open={j === 0} summary={`${lo.estimatedCost}${plane ? ` · priced with ${plane}` : ""}`}>
        {choices.length > 1 && <Field label="Airplane its rental hours are priced with" note="Most courses use the Cessna 172. Multi-engine courses can only use a twin.">
          <select className={`${selectFit} justify-self-start`} value={plane ?? ""} onChange={e => put(rateKey.assign(o.name), e.target.value)}>
            {choices.map(a => { const r = after.rentalRates.find(x => x.aircraft === a); return <option key={a} value={a}>{a}{r ? ` · ${r.prepay}/hr` : ""}</option>; })}
          </select></Field>}
        <ul className="grid gap-2">{o.lineItems.map((line, i) => {
          const fee = parseFee(line); const p = parseLine(line); const shown = lo.lineItems[i] ?? line;
          if (fee !== null) return <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 text-sm"><span>Course fee $</span>
            <Input aria-label={`${o.name} course fee`} inputMode="numeric" value={drafts[rateKey.fee(o.name)] ?? String(parseFee(shown) ?? fee)} onChange={e => put(rateKey.fee(o.name), e.target.value.replace(/[^\d]/g, ""))} /></li>;
          if (!p) return <li key={i} className="text-xs text-muted-foreground">{line}</li>;
          const cur = parseLine(shown);
          return <li key={i} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 text-sm">
            <Input aria-label={`Hours: ${p.what}`} inputMode="decimal" value={drafts[rateKey.hours(o.name, i)] ?? String(cur?.hours ?? p.hours)} onChange={e => put(rateKey.hours(o.name, i), money(e.target.value))} />
            <span className="min-w-0">hours {cur?.what ?? p.what}<span className="block text-xs text-muted-foreground">{shown}</span></span>
          </li>;
        })}</ul>
        <p className="border-t border-border pt-3 font-bold">{lo.estimatedCost}{was && was !== lo.estimatedCost && <span className="ml-2 text-xs font-normal text-muted-foreground">was {was.replace(/^As low as /, "")}</span>}</p>
        <p className={hint}>Hours here set the published estimate and the hour summaries on the program page. To change an hourly price, use Prices or the airplane's own price.</p>
      </Section>;
    })}
    <Footer errors={errors} onCancel={onCancel} onSubmit={save} label="Save changes" icon={<Save className="size-4" />} />
  </div>;
}

/** Optional price for a specialty course or endorsement: fee plus hours, priced from the rates. */
export function CoursePricingForm({ slug, pricing, rates, onSave, onCancel, onDraft }: { slug: string; pricing?: CoursePricing | undefined; rates: RatesConfig; onSave: (p: CoursePricing | null) => void; onCancel?: () => void; onDraft?: (p: CoursePricing | null) => void }) {
  const applied = useMemo(() => applyRates(rates), [rates]);
  const plane = slug === "tailwheel" ? "Taylorcraft BC-12D" : "Cessna 172";
  const instr = applied.instructionRates[0]?.label ?? "";
  const [fee, setFee] = useState(String(pricing?.fee ?? 0));
  const [blocks, setBlocks] = useState<ProgramBlock[]>(() => pricing?.blocks.length ? pricing.blocks : [
    { hours: 0, what: "rental", aircraft: plane }, { hours: 0, what: "flight", instruction: instr }, { hours: 0, what: "ground", instruction: instr },
  ]);
  const draft: CoursePricing = { fee: Number(fee) || 0, blocks: blocks.filter(b => b.hours > 0) };
  const empty = !draft.fee && !draft.blocks.length;
  const price = priceBlocks(draft.fee, draft.blocks, applied);
  useEffect(() => { onDraft?.(empty ? null : draft); }, [fee, blocks]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = empty ? ["Add hours or a course fee to show a price."] : [];
  const save = () => onSave(draft);
  return <div className="grid gap-4">
    <TopActions errors={errors} onCancel={onCancel} onSubmit={save} label="Save price" icon={<Save className="size-4" />} />
    <p className={hint}>Visitors see the estimate and its breakdown on the course page. Leave it unpriced to keep "In your training plan".</p>
    <Field label="Course fee $" note="Optional."><Input value={fee} onChange={e => setFee(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className="max-w-32" /></Field>
    <BlocksEditor blocks={blocks} setBlocks={setBlocks} applied={applied} defaultAircraft={plane} />
    <CostPreview items={price.items} total={empty ? "No price yet" : price.estimatedCost} />
    <div className="grid gap-2 border-t border-border pt-4">
      {errors.length > 0 && <ul className="text-xs text-destructive">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {pricing ? <Button type="button" variant="ghost" onClick={() => onSave(null)}><Trash2 className="size-4" /> Remove the price</Button> : <span />}
        <span className="flex gap-2">{onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="button" disabled={errors.length > 0} onClick={save}><Save className="size-4" /> Save price</Button></span>
      </div>
    </div>
  </div>;
}

export function CourseForm({ taken, onSubmit, onCancel, onDraft }: { taken: string[]; onSubmit: (c: AddedCourse) => void; onCancel?: () => void; onDraft?: (c: AddedCourse | null) => void }) {
  const [f, setF] = useState({ name: "", kind: "course" as SpecialtyKind, summary: "", definition: "", train: "", location: "", photo: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  const slug = slugify(f.name);
  const build = (): AddedCourse => ({ slug, name: f.name.trim(), kind: f.kind, summary: f.summary.trim(), definition: f.definition.trim(), train: linesOf(f.train), ...(f.location.trim() ? { location: f.location.trim() } : {}), ...(f.photo ? { photo: f.photo } : {}) });
  useEffect(() => { onDraft?.(slug ? build() : null); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = [!f.name.trim() && "Add the course name.", !f.summary.trim() && "Add a one-line summary for the card.", slug && (taken.includes(slug) || specialtyCourses.some(c => c.slug === slug)) && "A course with that name already exists."].filter(Boolean) as string[];
  return <div className="grid gap-4">
    <TopActions errors={errors} onCancel={onCancel} onSubmit={() => onSubmit(build())} label="Add course" icon={<Plus className="size-4" />} />
    <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
      <Field label="Course name"><Input value={f.name} onChange={set("name")} placeholder="Seaplane Rating" /></Field>
      <Field label="Kind"><select className={select} value={f.kind} onChange={set("kind")}>{(Object.keys(SPECIALTY_KIND_LABEL) as SpecialtyKind[]).map(k => <option key={k} value={k}>{SPECIALTY_KIND_LABEL[k]}</option>)}</select></Field>
    </div>
    <Field label="Card summary" note="One short line."><Input value={f.summary} onChange={set("summary")} /></Field>
    <Field label="What it is" note="Shown at the top of the course page."><Textarea rows={3} value={f.definition} onChange={set("definition")} /></Field>
    <Field label="What you'll train" note="One per line."><Textarea rows={3} value={f.train} onChange={set("train")} /></Field>
    <Field label="Location" note="Optional, for example Little Falls, MN"><Input value={f.location} onChange={set("location")} /></Field>
    <PhotoPick id={`course.${slug || "new"}.photo`} value={f.photo} onChange={photo => setF(v => ({ ...v, photo }))} />
    <Footer errors={errors} onCancel={onCancel} label="Add course" onSubmit={() => onSubmit(build())} />
  </div>;
}

function Footer({ errors, onCancel, onSubmit, label, icon = <Plus className="size-4" /> }: { errors: string[]; onCancel?: (() => void) | undefined; onSubmit: () => void; label: string; icon?: ReactNode }) {
  return <div className="grid gap-2 border-t border-border pt-4">
    {errors.length > 0 && <ul className="text-xs text-destructive">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
    <div className="flex flex-wrap justify-end gap-2">
      {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      <Button type="button" disabled={errors.length > 0} onClick={onSubmit}>{icon} {label}</Button>
    </div>
  </div>;
}

/** Add helpers shared by the editor and admin: return the new catalog (and new rate line). */
export const addPlane = (c: Catalog, r: PlaneResult): Catalog => ({ ...c, fleet: [...c.fleet.filter(x => x.registration !== r.plane.registration), r.plane] });
export const addProgram = (c: Catalog, p: AddedProgram): Catalog => ({ ...c, programs: [...c.programs.filter(x => x.slug !== p.slug), p] });
export const addCourse = (c: Catalog, x: AddedCourse): Catalog => ({ ...c, courses: [...c.courses.filter(y => y.slug !== x.slug), x] });

/** The visual editor's add panel: writes into the editor's unsaved changes (Publish makes it live). */
export function EditorAddForm({ kind, onDone }: { kind: "fleet" | "programs" | "courses"; onDone: () => void }) {
  const edit = useEditState();
  const { catalog } = useCatalog();
  const rates = withRateDrafts(edit.rateBase ?? {}, edit.rateDrafts);
  if (kind === "fleet") return <PlaneForm rates={rates} taken={catalog.fleet.map(f => f.registration)} onCancel={onDone} onSubmit={r => {
    if (r.newRow) editStore.setRateDraft(rateKey.newRow(r.newRow.aircraft), JSON.stringify({ names: r.newRow.names, regular: r.newRow.regular, prepay: r.newRow.prepay }), "");
    editStore.setCatalog(addPlane(catalog, r)); onDone();
  }} />;
  if (kind === "programs") return <ProgramForm rates={rates} taken={catalog.programs.map(p => p.slug)} onCancel={onDone} onSubmit={p => { editStore.setCatalog(addProgram(catalog, p)); onDone(); }} />;
  return <CourseForm taken={catalog.courses.map(c => c.slug)} onCancel={onDone} onSubmit={c => { editStore.setCatalog(addCourse(catalog, c)); onDone(); }} />;
}

const SPEC_NAMES = ["Year", "Model", "Horsepower", "Engine", "Engines", "Seats", "IFR/VFR", "Coms", "GPS", "Equipment", "Cruise speed", "Useful load", "Fuel", "Range"];
const iconBtn = "grid size-8 shrink-0 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30";
const move = <T,>(list: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= list.length) return list; const out = [...list]; [out[i], out[j]] = [out[j]!, out[i]!]; return out; };

/** Every detail of one airplane: words, type, specs, all its photos and which price line it uses. */
export function PlaneEditForm({ plane, original, rates, onSave, onReset, onCancel, onDraft }: { plane: Plane; original: Plane; rates: RatesConfig; onSave: (f: PlaneFields) => void; onReset?: (() => void) | undefined; onCancel?: () => void; onDraft?: (f: PlaneFields) => void }) {
  const applied = useMemo(() => applyRates(rates), [rates]);
  const [f, setF] = useState<PlaneFields>(() => fieldsOf(plane));
  useEffect(() => { onDraft?.(f); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const orig = useMemo(() => fieldsOf(original), [original]);
  const [adding, setAdding] = useState(0); const [err, setErr] = useState("");
  const reg = plane.registration;
  const set = <K extends keyof PlaneFields>(k: K, v: PlaneFields[K]) => setF(x => ({ ...x, [k]: v }));
  const text = (k: "name" | "nickname" | "use" | "note") => (e: { target: { value: string } }) => set(k, e.target.value.slice(0, PLANE_LIMITS[k]));
  const setSpec = (i: number, j: 0 | 1, v: string) => set("specs", f.specs.map((s, n) => n === i ? (j === 0 ? [v.slice(0, PLANE_LIMITS.specKey), s[1]] : [s[0], v.slice(0, PLANE_LIMITS.specValue)]) : s));
  const keys = f.specs.map(s => s[0].trim().toLowerCase()).filter(Boolean);
  const errors = [
    !f.name.trim() && "The airplane needs a name, for example 1975 Cessna 172M.",
    !f.use.trim() && "Say what the airplane is used for.",
    !f.image && "The airplane needs a main photo.",
    keys.length !== new Set(keys).size && "Two specs have the same name.",
    adding > 0 && "Wait for the photos to finish uploading.",
  ].filter(Boolean) as string[];
  async function addPhotos(files: FileList | null) {
    const list = [...(files ?? [])].slice(0, PLANE_LIMITS.photos - f.photos.length); if (!list.length) return;
    setErr(""); setAdding(list.length);
    for (const file of list) {
      try { const url = await uploadSlotPhoto(`fleet.${reg}.gallery`, file); setF(x => ({ ...x, photos: [...x.photos, url].slice(0, PLANE_LIMITS.photos) })); }
      catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); }
      setAdding(n => n - 1);
    }
  }
  const undo = (k: keyof PlaneFields) => JSON.stringify(f[k]) !== JSON.stringify(orig[k])
    ? <button type="button" onClick={() => set(k, orig[k])} className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5" /> Original</button> : null;

  return <div className="grid gap-6">
    <section className="grid gap-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Basics</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tail number" note="The tail number can't change. Add a new airplane instead."><Input value={reg} disabled /></Field>
        <Field label="Nickname" note="Optional. Leave empty for none."><Input value={f.nickname} onChange={text("nickname")} /></Field>
      </div>
      <Field label="Airplane"><Input value={f.name} onChange={text("name")} placeholder="1975 Cessna 172M" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" note="Sets the fleet filter and the training it links to."><select className={select} value={f.role} onChange={e => set("role", e.target.value as FleetRole)}><option value="trainer">Trainer</option><option value="twin">Twin</option><option value="tailwheel">Tailwheel</option></select></Field>
        <Field label="Used for"><Input value={f.use} onChange={text("use")} placeholder="Primary · Instrument · Commercial" /></Field>
      </div>
      <Field label="Short note" note="One or two sentences on the fleet card and airplane page."><Textarea rows={2} value={f.note} onChange={text("note")} /></Field>
    </section>

    <section className="grid gap-4 border-t border-border pt-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Photos</h3>
      <PhotoPick id={`fleet.${reg}.photo`} label="Main photo" value={f.image} onChange={v => set("image", v)} extra={undo("image")}
        note="Shown on the fleet card and at the top of the airplane page. A side view on a plain background looks best." />
      <PhotoPick id={`fleet.${reg}.panel`} label="Instrument panel" value={f.panel} onChange={v => set("panel", v)} note="Optional. Shown under Equipment & avionics."
        extra={<>{f.panel && <button type="button" onClick={() => set("panel", "")} className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /> Remove</button>}{undo("panel")}</>} />
      <div className={field}>More photos
        {f.photos.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{f.photos.map((url, i) => <li key={url} className="border border-border">
          <img src={url} alt={`Photo ${i + 2}`} className="aspect-[4/3] w-full object-cover" />
          <div className="flex items-center justify-between">
            <span className="flex"><button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => set("photos", move(f.photos, i, -1))} className={iconBtn}><ArrowLeft className="size-4" /></button>
              <button type="button" aria-label="Move later" disabled={i === f.photos.length - 1} onClick={() => set("photos", move(f.photos, i, 1))} className={iconBtn}><ArrowRight className="size-4" /></button></span>
            <button type="button" aria-label={`Remove photo ${i + 2}`} onClick={() => set("photos", f.photos.filter((_, j) => j !== i))} className={`${iconBtn} hover:!text-destructive`}><X className="size-4" /></button>
          </div>
        </li>)}</ul>}
        {f.photos.length < PLANE_LIMITS.photos && <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 border border-input px-3 text-sm font-semibold hover:bg-secondary">
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {adding ? `Uploading ${adding}…` : "Add photos"}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={e => { void addPhotos(e.target.files); e.target.value = ""; }} />
        </label>}
        {err && <span className="text-xs text-destructive">{err}</span>}
        <span className={hint}>Visitors flip through these after the main photo in the photo viewer. Up to {PLANE_LIMITS.photos}.</span>
      </div>
    </section>

    <section className="grid gap-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold uppercase tracking-[0.14em]">Specs</h3>{undo("specs")}</div>
      <datalist id="plane-spec-names">{SPEC_NAMES.map(n => <option key={n} value={n} />)}</datalist>
      {f.specs.length === 0 && <p className={hint}>No specs yet.</p>}
      <ul className="grid gap-2">{f.specs.map(([k, v], i) => <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-center gap-2">
        <Input aria-label={`Spec ${i + 1} name`} value={k} list="plane-spec-names" onChange={e => setSpec(i, 0, e.target.value)} placeholder="Seats" />
        <Input aria-label={`Spec ${i + 1} value`} value={v} onChange={e => setSpec(i, 1, e.target.value)} placeholder="4" />
        <span className="flex">
          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => set("specs", move(f.specs, i, -1))} className={iconBtn}><ArrowUp className="size-4" /></button>
          <button type="button" aria-label="Move down" disabled={i === f.specs.length - 1} onClick={() => set("specs", move(f.specs, i, 1))} className={iconBtn}><ArrowDown className="size-4" /></button>
          <button type="button" aria-label={`Remove ${k || "spec"}`} onClick={() => set("specs", f.specs.filter((_, j) => j !== i))} className={`${iconBtn} hover:!text-destructive`}><Trash2 className="size-4" /></button>
        </span>
      </li>)}</ul>
      {f.specs.length < PLANE_LIMITS.specs && <button type="button" onClick={() => set("specs", [...f.specs, ["", ""]])} className="inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-primary-text"><Plus className="size-4" /> Add a spec</button>}
      <span className={hint}>Seats, Horsepower and GPS also show as quick facts on the card. GPS, Equipment, IFR/VFR and Coms also list under Equipment & avionics. Rows left empty are skipped.</span>
    </section>

    <section className="grid gap-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold uppercase tracking-[0.14em]">Hourly price</h3>{undo("rateRow")}</div>
      <select aria-label="Price line" className={`${selectFit} justify-self-start`} value={f.rateRow} onChange={e => set("rateRow", e.target.value)}>
        {applied.rentalRates.map(r => <option key={r.aircraft} value={r.aircraft}>{r.aircraft}</option>)}
        <option value="">No published price</option>
      </select>
      <span className={hint}>{f.rateRow ? (() => { const s = applied.rentalRates.find(r => r.aircraft === f.rateRow); return s ? `Regular ${s.regular} / prepay ${s.prepay} per hour.` : priceHint; })() : "Visitors are asked to call for a price."}</span>
      <span className={hint}>To change the dollar amount, click the price on the page or use Prices. Every airplane on the same line changes together.</span>
    </section>

    <div className="grid gap-2 border-t border-border pt-4">
      {errors.length > 0 && <ul className="text-xs text-destructive">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onReset && plane.edited ? <Button type="button" variant="ghost" onClick={onReset}><RotateCcw className="size-4" /> Put back the original</Button> : <span />}
        <span className="flex gap-2">
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="button" disabled={errors.length > 0} onClick={() => onSave({ ...f, name: f.name.trim(), nickname: f.nickname.trim(), use: f.use.trim(), note: f.note.trim(), specs: f.specs.map(([k, v]) => [k.trim(), v.trim()] as [string, string]).filter(([k, v]) => k && v) })}><Save className="size-4" /> Save changes</Button>
        </span>
      </div>
    </div>
  </div>;
}

/** The visual editor's "Edit details & photos" panel: writes into the editor's unsaved changes. */
export function EditorPlaneForm({ reg, onDone }: { reg: string; onDone: () => void }) {
  const edit = useEditState();
  const { catalog } = useCatalog();
  const rates = withRateDrafts(edit.rateBase ?? {}, edit.rateDrafts);
  const plane = allPlanes(catalog).find(p => p.registration === reg);
  const original = originalPlane(catalog, reg);
  if (!plane || !original) return <p className="text-sm">This airplane is no longer in the list.</p>;
  return <PlaneEditForm plane={plane} original={original} rates={rates} onCancel={onDone}
    onReset={() => { editStore.setCatalog(resetPlane(catalog, reg)); onDone(); }}
    onSave={f => { editStore.setCatalog(editPlane(catalog, reg, f)); onDone(); }} />;
}
