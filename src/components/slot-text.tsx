import { useEffect, useRef, type ReactNode } from "react";
import { SLOT_BY_KEY, slotLimit } from "@/lib/content-slots";
import { editStore, isEditing, useEditState, type SpotMeta } from "@/lib/edit-store";
import { useSiteContent } from "@/lib/use-site-content";
import { useLiveRates } from "@/lib/use-live-rates";
import { aircraftChoicesFor, applyRates, defaultAircraftFor, FLEET_RATE_ROW, rateKey, rateLabel, rateValue } from "@/lib/rates-engine";
import { programs } from "@/lib/site-data";

const humanize = (k: string) => k.split(".").map(s => s.replace(/[-_]/g, " ")).join(" · ");

/** Words from an editable spot. Published: plain text, no wrapper, identical to the original.
 *  Visual editor on: the same text becomes click-to-type in place (only an outline is added).
 *  Spots listed in content-slots need only `k`; any other text passes its original words as `d`. */
export function SlotText({ k, d, label, multiline }: { k: string; d?: string; label?: string; multiline?: boolean }) {
  const site = useSiteContent();
  const edit = useEditState();
  const known = SLOT_BY_KEY.get(k);
  const def = known?.def ?? d ?? "";
  const value = known ? site.get(k) : site.text(k, def);
  if (!isEditing(edit)) return <>{value}</>;
  const meta: SpotMeta = { label: known?.label ?? label ?? humanize(k), max: known?.max ?? slotLimit(def), def };
  return <EditableSpan k={k} value={value} meta={meta} multiline={known?.multiline ?? multiline ?? def.length > 90}
    onType={t => editStore.setDraft(k, t, editStore.get().base?.[k] ?? def)}
    onEmpty={() => { editStore.setDraft(k, def, editStore.get().base?.[k] ?? def); return def; }} />;
}

/** A price tied to the rates table. Change it on any page and every page and course that uses it
 *  updates. `amount` shows only the dollar figure of a priced item ("$129" from "$129/hr"). */
export function RateText({ k, amount = false }: { k: string; amount?: boolean }) {
  const rates = useLiveRates();
  const edit = useEditState();
  const full = rateValue(rates, k);
  const money = /\$([\d,]+(?:\.\d+)?)/.exec(full);
  const numeric = !k.startsWith("rate|other|");
  const shown = amount ? (money?.[0] ?? full) : full;
  if (!isEditing(edit)) return <>{shown}</>;
  const published = rateValue(ratesOf(edit), k);
  const meta: SpotMeta = { label: rateLabel(k), max: numeric || amount ? 7 : 40, hint: "Price · updates every page and course that uses it" };
  if (numeric || amount) {
    const digits = money?.[1]?.replace(/,/g, "") ?? "";
    const toDraft = (t: string) => numeric ? t : full.replace(/\$[\d,]+(?:\.\d+)?/, `$${t}`);
    return <>$<EditableSpan k={k} value={digits} meta={meta} numeric
      onType={t => { const n = t.replace(/[^\d.]/g, ""); if (n) editStore.setRateDraft(k, toDraft(n), numeric ? published.replace(/[^\d.]/g, "") : published); }}
      onEmpty={() => { editStore.setRateDraft(k, numeric ? published.replace(/[^\d.]/g, "") : published, numeric ? published.replace(/[^\d.]/g, "") : published); return (published.match(/\$([\d,]+(?:\.\d+)?)/)?.[1] ?? "").replace(/,/g, ""); }} /></>;
  }
  return <EditableSpan k={k} value={full} meta={meta}
    onType={t => editStore.setRateDraft(k, t, published)}
    onEmpty={() => { editStore.setRateDraft(k, published, published); return published; }} />;
}
// Published rates (what Discard returns to), from the base the editor loaded.
let pubMemo: { base: unknown; out: ReturnType<typeof applyRates> } | null = null;
function ratesOf(edit: ReturnType<typeof useEditState>) {
  if (pubMemo && pubMemo.base === edit.rateBase) return pubMemo.out;
  pubMemo = { base: edit.rateBase, out: applyRates(edit.rateBase ?? {}) };
  return pubMemo.out;
}

/** A figure worked out from the rates (course totals, cost lines). Not typed: in the editor it is
 *  marked so the owner knows to change the hourly rate instead. */
export function CalcText({ children }: { children: ReactNode }) {
  const edit = useEditState();
  if (!isEditing(edit)) return <>{children}</>;
  return <span data-slot-calc className="slot-calc" title="Worked out from the rates. Change an hourly rate and this updates.">{children}</span>;
}

/** Editor-only: which rental airplane prices a course. Visitors never see it. */
export function AssignAircraft({ option }: { option: string }) {
  const edit = useEditState();
  const rates = useLiveRates();
  const o = programs.flatMap(p => p.options).find(x => x.name === option);
  const choices = o ? aircraftChoicesFor(o.lineItems) : [];
  if (!isEditing(edit) || !o || choices.length < 2) return null; // e.g. multi-engine courses: the Apache is the only twin
  const k = rateKey.assign(option);
  const published = rateValue(ratesOf(edit), k);
  const current = rateValue(rates, k);
  return <label className="slot-assign mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
    Priced with
    <select value={choices.includes(current) ? current : defaultAircraftFor(o.lineItems)!} onChange={e => editStore.setRateDraft(k, e.target.value, published)} className="h-9 w-auto max-w-full min-w-0 border border-primary bg-background px-2 text-sm normal-case tracking-normal text-foreground">
      {rates.rentalRates.filter(r => choices.includes(r.aircraft)).map(r => <option key={r.aircraft} value={r.aircraft}>{r.aircraft} · {r.prepay}/hr prepay</option>)}
    </select>
  </label>;
}

export function EditableSpan({ k, value, meta, multiline = false, numeric = false, onType, onEmpty }: { k: string; value: string; meta: SpotMeta; multiline?: boolean; numeric?: boolean; onType: (t: string) => void; onEmpty: () => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { editStore.describe(k, meta); });
  // React never renders the text (that reset the caret); it is set here and synced from outside
  // changes (restore, discard, the same spot typed elsewhere on the page) only while not being typed in.
  useEffect(() => { const el = ref.current; if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value; }, [value]);
  return <span ref={ref} data-slot-text={k} className={`slot-edit${numeric ? " slot-rate" : ""}`} contentEditable="plaintext-only" suppressContentEditableWarning spellCheck={!numeric}
    role="textbox" aria-label={meta.label} aria-multiline={multiline ? true : undefined} inputMode={numeric ? "decimal" : undefined}
    onClickCapture={e => e.preventDefault()}
    onFocus={() => { editStore.describe(k, meta); editStore.setFocus(k); }}
    onBlur={e => { editStore.setFocus(null); if (!e.currentTarget.textContent?.trim()) e.currentTarget.textContent = onEmpty(); }}
    onKeyDown={e => { if (e.key === "Enter" && (!multiline || numeric)) { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") e.currentTarget.blur(); }}
    onInput={e => onType((e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim())} />;
}

/** A fleet airplane's price from the live rental table ("$185/hr"), editable in place. */
export function FleetPrice({ reg, field, suffix = "/hr", row: rowIn }: { reg: string; field: "regular" | "prepay"; suffix?: string; row?: string | undefined }) {
  const row = rowIn ?? FLEET_RATE_ROW[reg];
  return row ? <><RateText k={rateKey.rental(row, field)} />{suffix}</> : null;
}
