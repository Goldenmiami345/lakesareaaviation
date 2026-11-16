// Visual editor bar (admins only, loaded lazily when edit mode is on). The page underneath is the
// real site: text slots become click-to-type, slot photos click-to-replace. Nothing else is editable.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Check, History, ImageUp, Loader2, PencilLine, RotateCcw, Settings2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cleanContent, SLOT_BY_KEY } from "@/lib/content-slots";
import { editStore, useEditState } from "@/lib/edit-store";
import { uploadSlotPhoto } from "@/lib/media-upload";
import { resetSiteContent } from "@/lib/use-site-content";
import { fleet, programs, specialtyCourses } from "@/lib/site-data";

type Version = { id: string; content: Json; note: string | null; saved_at: string };
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const EDIT_PAGES: { label: string; path: string }[] = [
  { label: "Home", path: "/" },
  { label: "Programs", path: "/programs" },
  ...programs.map(p => ({ label: `Program · ${p.name}`, path: `/programs/${p.slug}` })),
  { label: "Specialized training", path: "/specialized-training" },
  ...specialtyCourses.map(c => ({ label: `Course · ${c.name}`, path: `/specialized-training/${c.slug}` })),
  { label: "Student success", path: "/student-success" },
  { label: "Fleet", path: "/fleet" },
  ...fleet.map(f => ({ label: `Airplane · ${f.registration}`, path: `/fleet/${f.registration.toLowerCase()}` })),
];
const bar = "inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold uppercase tracking-[0.08em] transition-colors hover:bg-background/10 disabled:opacity-40";

export default function SiteEditor() {
  const edit = useEditState();
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hover, setHover] = useState<{ key: string; rect: DOMRect } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const pendingPhoto = useRef<string | null>(null);
  const path = router.state.location.pathname.replace(/\/$/, "") || "/";

  async function loadPublished() {
    const [{ data: cur }, { data: hist }] = await Promise.all([
      supabase.from("site_content").select("content").eq("id", "current").maybeSingle(),
      supabase.from("site_content_history").select("id, content, note, saved_at").order("replaced_at", { ascending: false }).limit(20),
    ]);
    editStore.setBase(cleanContent(cur?.content)); setHistory((hist ?? []) as Version[]);
  }
  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const role = auth.user ? (await supabase.from("user_roles").select("id").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle()).data : null;
      setAdmin(Boolean(role));
      if (role) await loadPublished();
    })();
  }, []);

  // Outline hooks for CSS, photo click-to-replace and the hover chip, only while an admin edits.
  useEffect(() => {
    if (!admin) return;
    const html = document.documentElement; html.classList.add("site-editing");
    const photoOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>("[data-slot-photo]") : null);
    const onClick = (e: MouseEvent) => { const el = photoOf(e.target); if (!el) return; e.preventDefault(); e.stopPropagation(); pendingPhoto.current = el.dataset["slotPhoto"]!; file.current?.click(); };
    const onOver = (e: MouseEvent) => { const el = photoOf(e.target); setHover(el ? { key: el.dataset["slotPhoto"]!, rect: el.getBoundingClientRect() } : null); };
    const clear = () => setHover(null);
    document.addEventListener("click", onClick, true);
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("scroll", clear, { passive: true });
    return () => { html.classList.remove("site-editing"); document.removeEventListener("click", onClick, true); document.removeEventListener("mouseover", onOver); window.removeEventListener("scroll", clear); };
  }, [admin]);

  const drafts = edit.drafts;
  const keys = Object.keys(drafts);
  const tooLong = keys.filter(k => (drafts[k] ?? "").length > (SLOT_BY_KEY.get(k)?.max ?? Infinity));
  const focus = edit.focus ? SLOT_BY_KEY.get(edit.focus) : undefined;
  const focusLen = edit.focus ? (drafts[edit.focus] ?? edit.base?.[edit.focus] ?? focus?.def ?? "").length : 0;
  const pageInList = useMemo(() => EDIT_PAGES.some(p => p.path === path), [path]);

  async function onFile(f: File | undefined) {
    const key = pendingPhoto.current; if (!f || !key) return;
    setBusy(true); setMsg("Uploading photo…");
    try { const url = await uploadSlotPhoto(key, f); editStore.setDraft(key, url, edit.base?.[key] ?? SLOT_BY_KEY.get(key)?.def ?? ""); setMsg("Photo placed. Publish to make it live."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false); if (file.current) file.current.value = "";
  }
  async function write(content: Record<string, string>, note: string, done: string) {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("site_content").update({ content: content as Json, note }).eq("id", "current");
    if (error) setMsg(error.message);
    else { editStore.clearDrafts(); resetSiteContent(); await loadPublished(); setMsg(done); }
    setBusy(false);
  }
  const publish = () => write(cleanContent({ ...(edit.base ?? {}), ...drafts }), `Visual editor: ${keys.length} change${keys.length === 1 ? "" : "s"}`, "Published. Everyone sees it now.");
  const exit = () => {
    if (keys.length && !window.confirm(`Leave without publishing? Your ${keys.length} unsaved change${keys.length === 1 ? "" : "s"} will be lost.`)) return;
    editStore.stop(); router.history.push("/admin");
  };

  if (admin === false) return <div className="fixed inset-x-0 bottom-4 z-[200] mx-auto flex w-fit items-center gap-3 bg-ink px-4 py-2 text-sm text-background shadow-2xl">
    Only the site administrator can edit. <a href="/admin" className="font-bold underline">Sign in</a><button type="button" className={bar} onClick={() => editStore.stop()}><X className="size-4" /> Exit</button></div>;
  if (admin === null) return null;

  return <>
    <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={e => onFile(e.target.files?.[0])} />
    {hover && <div className="pointer-events-none fixed z-[190] inline-flex items-center gap-1.5 bg-ink px-2.5 py-1.5 text-xs font-bold uppercase text-background shadow-lg" style={{ top: Math.max(8, hover.rect.top + 12), left: hover.rect.left + 12 }}>
      <ImageUp className="size-3.5" /> {drafts[hover.key] ? "New photo · click to change" : "Click to replace photo"}</div>}
    <div role="toolbar" aria-label="Site editor" className="fixed inset-x-2 bottom-3 z-[200] mx-auto flex max-w-fit flex-wrap items-center gap-px bg-ink text-background shadow-[0_18px_50px_-12px_oklch(0_0_0/0.6)] sm:bottom-5">
      <span className="flex min-h-10 items-center gap-2 pl-4 pr-2 text-xs font-bold uppercase tracking-[0.12em]"><PencilLine className="size-4 text-primary-text" /> Editing</span>
      <select aria-label="Page" value={pageInList ? path : ""} onChange={e => router.history.push(e.target.value)} className="h-10 max-w-52 bg-transparent px-2 text-xs font-semibold outline-none [&>option]:text-foreground">
        {!pageInList && <option value="">This page (nothing editable)</option>}
        {EDIT_PAGES.map(p => <option key={p.path} value={p.path}>{p.label}</option>)}
      </select>
      <span className="min-h-10 min-w-40 px-3 py-1 text-xs tabular-nums text-background/75 flex flex-col justify-center" aria-live="polite">
        {focus ? <><span className="truncate font-semibold text-background">{focus.label}</span><span className={focusLen > focus.max ? "font-bold text-destructive" : ""}>{focusLen} / {focus.max} characters{focusLen > focus.max ? " · too long" : ""}</span></>
          : msg || (keys.length ? `${keys.length} unsaved change${keys.length === 1 ? "" : "s"}` : "Click any outlined text or photo")}
      </span>
      <Popover>
        <PopoverTrigger className={bar} disabled={busy}><History className="size-4" /> History</PopoverTrigger>
        <PopoverContent side="top" align="end" className="z-[210] w-80 rounded-none p-2">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Restore a published version</p>
          <ul className="max-h-72 overflow-auto">
            <li><button type="button" disabled={busy} onClick={() => write({}, "Restored original words and photos", "Original words and photos are live again.")} className="flex min-h-11 w-full items-center justify-between gap-2 px-2 text-left text-sm hover:bg-secondary">Original words & photos <RotateCcw className="size-4" /></button></li>
            {history.map(v => <li key={v.id}><button type="button" disabled={busy} onClick={() => write(cleanContent(v.content), `Restored version from ${when(v.saved_at)}`, "That version is live again.")} className="flex min-h-11 w-full items-center justify-between gap-2 px-2 text-left text-sm hover:bg-secondary">
              <span className="min-w-0"><span className="block">{when(v.saved_at)}</span>{v.note && <span className="block truncate text-xs text-muted-foreground">{v.note}</span>}</span><RotateCcw className="size-4 shrink-0" /></button></li>)}
          </ul>
        </PopoverContent>
      </Popover>
      <button type="button" className={bar} disabled={busy || !keys.length} onClick={() => { editStore.clearDrafts(); setMsg("Changes discarded."); }}><RotateCcw className="size-4" /> Discard</button>
      <a href="/admin#settings" className={bar} title="Prices and site settings"><Settings2 className="size-4" /> Settings</a>
      <button type="button" className={`${bar} bg-primary text-primary-foreground hover:bg-primary/90`} disabled={busy || !keys.length || tooLong.length > 0} title={tooLong.length ? "Shorten the text marked too long first" : undefined} onClick={publish}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Publish</button>
      <button type="button" className={bar} aria-label="Exit editor" onClick={exit}><X className="size-4" /></button>
    </div>
  </>;
}
