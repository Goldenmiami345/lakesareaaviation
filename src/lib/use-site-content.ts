import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { contentOf, type SiteContent } from "./content-slots";
import { useEditState } from "./edit-store";

const DEFAULTS = contentOf({});
let cached: Promise<SiteContent> | null = null;
let resolved: SiteContent | null = null;
export function loadSiteContent() {
  cached ??= (async () => {
    const { data, error } = await supabase.from("site_content").select("content").eq("id", "current").maybeSingle();
    return error ? DEFAULTS : contentOf(data?.content);
  })().catch(() => DEFAULTS).then(v => (resolved = v));
  return cached;
}
export function resetSiteContent() { cached = null; resolved = null; }
/** Original words and photos on first render (prerender-identical), saved edits after mount,
 *  plus the admin's unsaved drafts while the visual editor is on. */
export function useSiteContent(): SiteContent {
  const [c, setC] = useState<SiteContent>(DEFAULTS);
  const edit = useEditState();
  useEffect(() => {
    if (resolved) { setC(resolved); return; }
    let live = true;
    void loadSiteContent().then(v => { if (live) setC(v); });
    return () => { live = false; };
  }, []);
  return useMemo(() => edit.on ? contentOf({ ...(edit.base ?? c.values), ...edit.drafts }) : c, [c, edit.on, edit.base, edit.drafts]);
}
