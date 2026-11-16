import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyRates, type AppliedRates } from "./rates-engine";

const DEFAULTS = applyRates({});
let cached: Promise<AppliedRates> | null = null;
let resolved: AppliedRates | null = null;
export function loadLiveRates() {
  cached ??= (async () => {
    const { data, error } = await supabase.from("site_rates").select("config").eq("id", "current").maybeSingle();
    return error ? DEFAULTS : applyRates(data?.config);
  })().catch(() => DEFAULTS).then(v => (resolved = v));
  return cached;
}
export function resetLiveRates() { cached = null; resolved = null; }
/** Published defaults on first render (prerender-identical), admin-saved rates after mount. */
export function useLiveRates(): AppliedRates {
  const [rates, setRates] = useState<AppliedRates>(DEFAULTS);
  useEffect(() => {
    if (resolved) { setRates(resolved); return; }
    let live = true;
    void loadLiveRates().then(v => { if (live) setRates(v); });
    return () => { live = false; };
  }, []);
  return rates;
}
