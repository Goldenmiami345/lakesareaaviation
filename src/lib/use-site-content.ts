import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { contentOf, type SiteContent } from "./content-slots";
import { useEditState } from "./edit-store";

// One shared copy of the saved words and photos for every spot on the page (hundreds of
// SlotTexts subscribe; one request loads them all).
const DEFAULTS = contentOf({});
let current: SiteContent = DEFAULTS;
let loading: Promise<SiteContent> | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function loadSiteContent() {
  loading ??= (async () => {
    const { data, error } = await supabase.from("site_content").select("content").eq("id", "current").maybeSingle();
    return error ? DEFAULTS : contentOf(data?.content);
  })().catch(() => DEFAULTS).then(v => { current = v; subs.forEach(f => f()); return v; });
  return loading;
}
/** Reload after a publish or restore; every spot on screen updates. */
export function resetSiteContent() { loading = null; if (typeof window !== "undefined") void loadSiteContent(); }

let memo: { c: SiteContent; base: Record<string, string> | null; drafts: Record<string, string>; out: SiteContent } | null = null;
/** Original words and photos on first render (prerender-identical), saved edits after mount,
 *  plus the admin's unsaved drafts while the visual editor is on. */
export function useSiteContent(): SiteContent {
  const c = useSyncExternalStore(subscribe, () => current, () => DEFAULTS);
  const edit = useEditState();
  useEffect(() => { void loadSiteContent(); }, []);
  if (!edit.on) return c;
  if (memo && memo.c === c && memo.base === edit.base && memo.drafts === edit.drafts) return memo.out;
  const out = contentOf({ ...(edit.base ?? c.values), ...edit.drafts });
  memo = { c, base: edit.base, drafts: edit.drafts, out };
  return out;
}
