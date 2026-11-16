import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { contentOf, type SiteContent } from "./content-slots";

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
/** Original words and photos on first render (prerender-identical), saved edits after mount. */
export function useSiteContent(): SiteContent {
  const [c, setC] = useState<SiteContent>(DEFAULTS);
  useEffect(() => {
    if (resolved) { setC(resolved); return; }
    let live = true;
    void loadSiteContent().then(v => { if (live) setC(v); });
    return () => { live = false; };
  }, []);
  return c;
}
