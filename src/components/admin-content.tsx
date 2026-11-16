import { useEffect, useMemo, useState } from "react";
import { Eye, History, ImageUp, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { cleanContent, SLOTS, type Slot } from "@/lib/content-slots";
import { resetSiteContent } from "@/lib/use-site-content";
import { programs, specialtyCourses } from "@/lib/site-data";
import { contentPages } from "@/lib/site-preview";
import { SitePreview } from "./site-preview";
import { ROW, ROW_ACTIONS, ROW_BTN, STICKY_SAVE } from "./admin-ui";

const NAMES = { programs: Object.fromEntries(programs.map(p => [p.slug, p.name])), courses: Object.fromEntries(specialtyCourses.map(c => [c.slug, c.name])) };

type Version = { id: string; content: Json; note: string | null; saved_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Shrink to at most 2560px wide and re-encode as WebP so uploads stay web-light. */
async function optimize(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error("Could not read that photo"))), "image/webp", 0.85));
}

/** Words and photos editor: fixed slots only, length limits, Save with note, restorable versions. */
export function AdminContent() {
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Version[]>([]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);

  async function load() {
    const [{ data: cur }, { data: hist }] = await Promise.all([
      supabase.from("site_content").select("content").eq("id", "current").maybeSingle(),
      supabase.from("site_content_history").select("id, content, note, saved_at").order("replaced_at", { ascending: false }).limit(30),
    ]);
    const c = cleanContent(cur?.content); setSaved(c); setDraft(c); setHistory((hist ?? []) as Version[]);
  }
  useEffect(() => { void load(); }, []);

  const groups = useMemo(() => [...new Set(SLOTS.map(s => s.group))], []);
  const changed = SLOTS.filter(s => (cleanContent(draft)[s.key] ?? "") !== (saved[s.key] ?? ""));
  const value = (s: Slot) => draft[s.key] ?? s.def;
  const set = (s: Slot, v: string) => setDraft(d => ({ ...d, [s.key]: v }));
  const restoreSlot = (s: Slot) => setDraft(d => { const n = { ...d }; delete n[s.key]; return n; });

  async function upload(s: Slot, file: File | undefined) {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const blob = await optimize(file);
      const path = `${s.key.replace(/[^a-z0-9.-]/gi, "_")}-${Date.now()}.webp`;
      const up = await supabase.storage.from("site-media").upload(path, blob, { contentType: "image/webp" });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("site-media").createSignedUrl(path, TEN_YEARS);
      if (signed.error || !signed.data) throw signed.error ?? new Error("Upload failed");
      set(s, signed.data.signedUrl); setMsg("Photo ready. Press Save to publish it.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
  }

  async function write(content: Record<string, string>, n: string, done: string) {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("site_content").update({ content: content as Json, note: n || null }).eq("id", "current");
    if (error) setMsg(error.message); else { setMsg(done); setNote(""); resetSiteContent(); await load(); }
    setBusy(false);
  }

  return <div className="mt-10 border-t border-border pt-8">
    <h2 className="font-display text-2xl">Words & photos</h2>
    <p className="mt-1 text-sm text-muted-foreground">Change the words or photo in a spot. Layout, fonts and colors stay locked, and each spot has a length limit so it always fits. Nothing goes live until you press Save.</p>
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">{groups.map(g => <details key={g} className="border border-border">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">{g}</summary>
      <div className="grid gap-5 border-t border-border p-4">{SLOTS.filter(s => s.group === g).map(s => {
        const v = value(s); const over = v.length > s.max; const edited = s.key in draft && draft[s.key] !== s.def;
        return <div key={s.key}>
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{s.label}</span>
            {edited && <button type="button" className="text-xs font-bold uppercase text-muted-foreground underline" onClick={() => restoreSlot(s)}>Use original</button>}</div>
          {s.kind === "photo" ? <div className="mt-2 flex flex-wrap items-center gap-3">
            {v && <img src={v} alt="" className="aspect-[4/3] w-32 object-cover outline outline-1 -outline-offset-1 outline-foreground/10" />}
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-input px-3 text-sm"><ImageUp className="size-4" /> Replace photo
              <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={e => upload(s, e.target.files?.[0])} /></label>
          </div> : <>
            {s.multiline ? <textarea rows={3} value={v} onChange={e => set(s, e.target.value)} className="mt-2 w-full border border-input bg-background p-3 text-sm outline-none focus:border-primary" />
              : <input value={v} onChange={e => set(s, e.target.value)} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" />}
            <p className={`mt-1 text-right text-xs tabular-nums ${over ? "font-bold text-destructive" : "text-muted-foreground"}`}>{v.length} / {s.max}{over ? " · too long to fit, will not be saved" : ""}</p>
          </>}
        </div>; })}</div>
    </details>)}</div>

    <div className="mt-6 border border-border bg-secondary p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em]">What this changes</p>
      {changed.length ? <ul className="mt-2 grid gap-1 text-sm">{changed.map(s => <li key={s.key}>{s.group}: {s.label}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No unsaved changes.</p>}
    </div>
    <div className="mt-3"><SitePreview pages={contentPages(changed.map(c => c.key), NAMES)} state={{ content: cleanContent(draft) }} /></div>
    <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Note for this change (optional)" className="mt-3 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
    <div className={`mt-3 grid grid-cols-2 gap-3 ${changed.length ? STICKY_SAVE : ""}`}>
      <Button disabled={busy || !changed.length} variant="outline" className="h-12 rounded-none" onClick={() => setDraft(saved)}>Discard changes</Button>
      <Button disabled={busy || !changed.length} className="h-12 rounded-none" onClick={() => write(cleanContent(draft), note, "Saved. The changes are live for everyone.")}><Save /> Save</Button>
    </div>

    <h3 className="mt-8 flex items-center gap-2 font-display text-xl"><History className="size-5" /> Earlier versions</h3>
    <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
      {[{ id: "original", label: "Original words and photos", note: null as string | null, content: {} as Record<string, string> }, ...history.map(v => ({ id: v.id, label: when(v.saved_at), note: v.note, content: cleanContent(v.content) }))].map(v => {
        // The pages to show first: wherever this version differs from what is live now.
        const diff = [...new Set([...Object.keys(v.content), ...Object.keys(saved)])].filter(k => v.content[k] !== saved[k]);
        return <li key={v.id} className="grid gap-3 border border-border p-3 text-sm">
          <div className={ROW}><span className="min-w-0"><span className="block">{v.label}</span>{v.note && <span className="block text-muted-foreground">{v.note}</span>}</span>
            <span className={ROW_ACTIONS}>
              <Button size="sm" variant={peek === v.id ? "secondary" : "outline"} className={`${ROW_BTN} rounded-none`} aria-expanded={peek === v.id} onClick={() => setPeek(p => (p === v.id ? null : v.id))}><Eye /> Preview</Button>
              <Button size="sm" variant="outline" disabled={busy} className={`${ROW_BTN} rounded-none`} onClick={() => write(v.content, v.id === "original" ? "Restored original words and photos" : `Restored version from ${v.label}`, "That version is restored and live.")}><RotateCcw /> Restore</Button>
            </span></div>
          {peek === v.id && <SitePreview startOpen pages={contentPages(diff, NAMES)} state={{ content: v.content }} title={`Earlier words & photos · ${v.label} · not live`} onClose={() => setPeek(null)} />}
        </li>;
      })}
    </ul>
    {msg && <p className="mt-4 text-sm text-muted-foreground" role="status">{msg}</p>}
  </div>;
}
