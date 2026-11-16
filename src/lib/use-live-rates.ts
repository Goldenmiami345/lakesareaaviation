import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyRates, withRateDrafts, type AppliedRates, type RatesConfig } from "./rates-engine";
import { useEditState } from "./edit-store";

// One shared copy of the saved rates for every price on the page.
const DEFAULTS = applyRates({});
let current: AppliedRates = DEFAULTS;
let loading: Promise<AppliedRates> | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function loadLiveRates() {
  loading ??= (async () => {
    const { data, error } = await supabase.from("site_rates").select("config").eq("id", "current").maybeSingle();
    return error ? DEFAULTS : applyRates(data?.config);
  })().catch(() => DEFAULTS).then(v => { current = v; subs.forEach(f => f()); return v; });
  return loading;
}
export function resetLiveRates() { loading = null; if (typeof window !== "undefined") void loadLiveRates(); }

let memo: { r: AppliedRates; base: RatesConfig | null; drafts: Record<string, string>; out: AppliedRates } | null = null;
/** Published defaults on first render (prerender-identical), admin-saved rates after mount, and
 *  while the visual editor is on, the admin's unsaved rate edits worked through every course. */
export function useLiveRates(): AppliedRates {
  const r = useSyncExternalStore(subscribe, () => current, () => DEFAULTS);
  const edit = useEditState();
  useEffect(() => { void loadLiveRates(); }, []);
  if (!edit.on || (!edit.rateBase && !Object.keys(edit.rateDrafts).length)) return r;
  if (memo && memo.r === r && memo.base === edit.rateBase && memo.drafts === edit.rateDrafts) return memo.out;
  const out = applyRates(withRateDrafts(edit.rateBase ?? r.config, edit.rateDrafts));
  memo = { r, base: edit.rateBase, drafts: edit.rateDrafts, out };
  return out;
}
