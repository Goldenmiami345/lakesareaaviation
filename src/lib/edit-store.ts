// Visual editor state (admins only): on/off, unsaved drafts per content slot, the focused slot.
// Kept in sessionStorage so drafts survive moving between pages while editing.
import { useSyncExternalStore } from "react";

export type EditState = { on: boolean; drafts: Record<string, string>; base: Record<string, string> | null; focus: string | null };
const KEY = "site-edit-v1";
const OFF: EditState = { on: false, drafts: {}, base: null, focus: null };
let state: EditState = OFF;
let loaded = false;
const subs = new Set<() => void>();

function init() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (s?.on) state = { ...OFF, on: true, drafts: s.drafts ?? {} }; } catch { /* ignore */ }
}
function set(next: Partial<EditState>) {
  state = { ...state, ...next };
  try { sessionStorage.setItem(KEY, JSON.stringify({ on: state.on, drafts: state.drafts })); } catch { /* ignore */ }
  subs.forEach(f => f());
}
export const editStore = {
  get: () => { init(); return state; },
  start: () => { init(); set({ on: true }); },
  stop: () => { set({ ...OFF }); },
  setBase: (base: Record<string, string>) => set({ base }),
  setFocus: (focus: string | null) => set({ focus }),
  /** Draft = what the slot should read; matching the published value drops the draft. */
  setDraft: (key: string, value: string, published: string) => {
    const drafts = { ...state.drafts };
    if (value === published) delete drafts[key]; else drafts[key] = value;
    set({ drafts });
  },
  clearDrafts: () => set({ drafts: {} }),
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Always OFF during prerender and hydration, so edit mode never changes the published HTML. */
export function useEditState() { return useSyncExternalStore(subscribe, editStore.get, () => OFF); }
