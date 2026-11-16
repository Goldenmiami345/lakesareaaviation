import { useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allCourses, allPlanes, allPrograms, cleanCatalog, EMPTY_CATALOG, type Catalog } from "./catalog";
import { isEditing, useEditState } from "./edit-store";
import { useLiveRates } from "./use-live-rates";

// One shared copy of the owner's fleet/course additions and hides. First render (prerender and
// hydration) uses the published lists only, so the HTML never changes.
let current: Catalog = EMPTY_CATALOG;
let ready = false;
let loading: Promise<Catalog> | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
type Snap = { catalog: Catalog; ready: boolean };
let snap: Snap = { catalog: current, ready };
const SERVER: Snap = { catalog: EMPTY_CATALOG, ready: false };

export function loadCatalog() {
  loading ??= (async () => {
    const { data, error } = await supabase.from("site_catalog").select("catalog").eq("id", "current").maybeSingle();
    return error ? EMPTY_CATALOG : cleanCatalog(data?.catalog);
  })().catch(() => EMPTY_CATALOG).then(v => { current = v; ready = true; snap = { catalog: v, ready }; subs.forEach(f => f()); return v; });
  return loading;
}
export function resetCatalog() { loading = null; if (typeof window !== "undefined") void loadCatalog(); }

/** The catalog visitors see, or, while the visual editor is on, the admin's unsaved version. */
export function useCatalog() {
  const s = useSyncExternalStore(subscribe, () => snap, () => SERVER);
  const edit = useEditState();
  useEffect(() => { void loadCatalog(); }, []);
  const catalog = edit.on ? (edit.catalogDraft ?? edit.catalogBase ?? s.catalog) : s.catalog;
  return { catalog, ready: s.ready, editing: isEditing(edit) };
}

/** Planes, programs and courses as pages show them. In the editor hidden ones are included
 *  (marked) so they can be brought back; visitors never see them. */
export function useFleet() {
  const { catalog, ready, editing } = useCatalog();
  const rates = useLiveRates();
  const all = useMemo(() => allPlanes(catalog, rates), [catalog, rates]);
  return { all, planes: all.filter(p => !p.hidden), ready, editing };
}
export function usePrograms() {
  const { catalog, ready, editing } = useCatalog();
  const rates = useLiveRates();
  const all = useMemo(() => allPrograms(catalog, rates), [catalog, rates]);
  return { all, programs: all.filter(p => !p.hidden), ready, editing };
}
export function useCourses() {
  const { catalog, ready, editing } = useCatalog();
  const rates = useLiveRates();
  const all = useMemo(() => allCourses(catalog, rates), [catalog, rates]);
  return { all, courses: all.filter(p => !p.hidden), ready, editing };
}
