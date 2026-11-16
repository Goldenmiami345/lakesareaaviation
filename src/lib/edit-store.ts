// Visual editor state (admins only): on/off, unsaved drafts per content slot and per rate,
// the focused spot. Kept in sessionStorage so drafts survive moving between pages while editing.
import { useSyncExternalStore } from "react";
import type { RatesConfig } from "./rates-engine";

export type EditState = {
  on: boolean;
  drafts: Record<string, string>;
  base: Record<string, string> | null;
  rateDrafts: Record<string, string>;
  rateBase: RatesConfig | null;
  focus: string | null;
};
/** What the editor bar shows for the spot being typed in. */
export type SpotMeta = { label: string; max?: number; def?: string; hint?: string };
const KEY = "site-edit-v1";
const OFF: EditState = { on: false, drafts: {}, base: null, rateDrafts: {}, rateBase: null, focus: null };
let state: EditState = OFF;
let loaded = false;
const subs = new Set<() => void>();
const META = new Map<string, SpotMeta>();

function init() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (s?.on) state = { ...OFF, on: true, drafts: s.drafts ?? {}, rateDrafts: s.rateDrafts ?? {} }; } catch { /* ignore */ }
}
function set(next: Partial<EditState>) {
  state = { ...state, ...next };
  try { sessionStorage.setItem(KEY, JSON.stringify({ on: state.on, drafts: state.drafts, rateDrafts: state.rateDrafts })); } catch { /* ignore */ }
  subs.forEach(f => f());
}
const without = (m: Record<string, string>, key: string, value: string, published: string) => {
  const out = { ...m }; if (value === published) delete out[key]; else out[key] = value; return out;
};
export const editStore = {
  get: () => { init(); return state; },
  start: () => { init(); set({ on: true }); },
  stop: () => { set({ ...OFF }); },
  setBase: (base: Record<string, string>) => set({ base }),
  setRateBase: (rateBase: RatesConfig) => set({ rateBase }),
  setFocus: (focus: string | null) => set({ focus }),
  /** Draft = what the slot should read; matching the published value drops the draft. */
  setDraft: (key: string, value: string, published: string) => set({ drafts: without(state.drafts, key, value, published) }),
  setRateDraft: (key: string, value: string, published: string) => set({ rateDrafts: without(state.rateDrafts, key, value, published) }),
  clearDrafts: () => set({ drafts: {}, rateDrafts: {} }),
  /** Editable spots describe themselves (label, limit, default) when they appear on a page. */
  describe: (key: string, meta: SpotMeta) => { META.set(key, meta); },
  meta: (key: string) => META.get(key),
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Always OFF during prerender and hydration, so edit mode never changes the published HTML. */
export function useEditState() { return useSyncExternalStore(subscribe, editStore.get, () => OFF); }
