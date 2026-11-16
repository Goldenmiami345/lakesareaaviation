// Visual editor state (admins only): on/off, unsaved drafts per content slot and per rate,
// the focused spot. Kept in sessionStorage so drafts survive moving between pages while editing.
import { useSyncExternalStore } from "react";
import type { RatesConfig } from "./rates-engine";
import type { Catalog } from "./catalog";

export type EditState = {
  on: boolean;
  /** Preview: the page acts like the live site (links work, nothing is editable) but still shows
   *  the unsaved changes. Edit: words, prices and photos are clickable, links and buttons are off. */
  preview: boolean;
  drafts: Record<string, string>;
  base: Record<string, string> | null;
  rateDrafts: Record<string, string>;
  rateBase: RatesConfig | null;
  /** Unsaved fleet/course additions and hides (whole catalog), and the published one. */
  catalogDraft: Catalog | null;
  catalogBase: Catalog | null;
  focus: string | null;
};
/** What the editor bar shows for the spot being typed in. */
export type SpotMeta = { label: string; max?: number; def?: string; hint?: string };
const KEY = "site-edit-v1";
const OFF: EditState = { on: false, preview: false, drafts: {}, base: null, rateDrafts: {}, rateBase: null, catalogDraft: null, catalogBase: null, focus: null };
let state: EditState = OFF;
let loaded = false;
const subs = new Set<() => void>();
const META = new Map<string, SpotMeta>();

function init() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (s?.on) state = { ...OFF, on: true, preview: s.preview === true, drafts: s.drafts ?? {}, rateDrafts: s.rateDrafts ?? {}, catalogDraft: s.catalogDraft ?? null }; } catch { /* ignore */ }
}
function set(next: Partial<EditState>) {
  state = { ...state, ...next };
  try { sessionStorage.setItem(KEY, JSON.stringify({ on: state.on, preview: state.preview, drafts: state.drafts, rateDrafts: state.rateDrafts, catalogDraft: state.catalogDraft })); } catch { /* ignore */ }
  subs.forEach(f => f());
}
const without = (m: Record<string, string>, key: string, value: string, published: string) => {
  const out = { ...m }; if (value === published) delete out[key]; else out[key] = value; return out;
};
export const editStore = {
  get: () => { init(); return state; },
  start: () => { init(); set({ on: true, preview: false }); },
  setPreview: (preview: boolean) => set({ preview, focus: null }),
  stop: () => { set({ ...OFF }); },
  setBase: (base: Record<string, string>) => set({ base }),
  setRateBase: (rateBase: RatesConfig) => set({ rateBase }),
  setCatalogBase: (catalogBase: Catalog) => set({ catalogBase }),
  setCatalog: (catalogDraft: Catalog | null) => set({ catalogDraft }),
  setFocus: (focus: string | null) => set({ focus }),
  /** Draft = what the slot should read; matching the published value drops the draft. */
  setDraft: (key: string, value: string, published: string) => set({ drafts: without(state.drafts, key, value, published) }),
  setRateDraft: (key: string, value: string, published: string) => set({ rateDrafts: without(state.rateDrafts, key, value, published) }),
  clearDrafts: () => set({ drafts: {}, rateDrafts: {}, catalogDraft: null }),
  /** Editable spots describe themselves (label, limit, default) when they appear on a page. */
  describe: (key: string, meta: SpotMeta) => { META.set(key, meta); },
  meta: (key: string) => META.get(key),
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Always OFF during prerender and hydration, so edit mode never changes the published HTML. */
export function useEditState() { return useSyncExternalStore(subscribe, editStore.get, () => OFF); }
/** True only in Edit (not Preview): the switch for every click-to-edit spot and editor button. */
export const isEditing = (s: EditState) => s.on && !s.preview;
