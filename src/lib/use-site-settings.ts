import { parseMobileJourneyMode, type MobileJourneyMode } from "./story-nav";
import { useEffect, useLayoutEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { modelsEnabled } from './model-visibility';
import { mapModelRegs } from './map-models';

let cachedModels: Promise<boolean> | null = null;
let resolvedModels: boolean | null = null;
/** The visitor 3D switch (site_settings.show_3d_models), fetched once per page load; fails closed. */
export function loadShow3DModels() {
  cachedModels ??= (async () => {
    const { data, error } = await supabase.from('site_settings').select('show_3d_models').eq('id', 'brand').maybeSingle();
    return !error && modelsEnabled(data?.show_3d_models);
  })().catch(() => false).then(v => { resolvedModels = v; return v; });
  return cachedModels;
}
/** null until the switch has loaded (first render always null, so prerendered HTML never depends on it). */
export function useShow3DModelsState() {
  const [show, setShow] = useState<boolean | null>(null);
  useEffect(() => {
    if (resolvedModels !== null) { setShow(resolvedModels); return; }
    let live = true;
    void loadShow3DModels().then(value => { if (live) setShow(value); });
    return () => { live = false; };
  }, []);
  return show;
}
export function useShow3DModels() { return useShow3DModelsState() === true; }

export type TrafficPatternMode = "off" | "pulse" | "always";
const MODES: readonly TrafficPatternMode[] = ["off", "pulse", "always"];

// Owner setting (site_settings.traffic_pattern_mode, default 'pulse'). Read after
// mount only, so prerendered HTML never contains the drawn pattern.
let cached: Promise<TrafficPatternMode> | null = null;
function loadPatternMode() {
  cached ??= (async () => {
    const { data } = await supabase.from("site_settings").select("traffic_pattern_mode").eq("id", "brand").maybeSingle();
    const mode = (data as { traffic_pattern_mode?: string } | null)?.traffic_pattern_mode;
    return MODES.includes(mode as TrafficPatternMode) ? (mode as TrafficPatternMode) : "pulse";
  })().catch(() => "pulse" as const);
  return cached;
}
/** 'off' until the setting has loaded on the client. */
export function useTrafficPatternMode() {
  const [mode, setMode] = useState<TrafficPatternMode>("off");
  useEffect(() => { let live = true; void loadPatternMode().then((v) => { if (live) setMode(v); }); return () => { live = false; }; }, []);
  return mode;
}


let cachedJourney: Promise<MobileJourneyMode> | null = null;
function loadJourneyMode() {
  cachedJourney ??= (async () => {
    const { data } = await supabase.from("site_settings").select("mobile_journey_mode").eq("id", "brand").maybeSingle();
    return parseMobileJourneyMode((data as { mobile_journey_mode?: string } | null)?.mobile_journey_mode);
  })().catch(() => "scroll" as const);
  return cachedJourney;
}
/** Owner setting for phone home sections; 'scroll' until loaded on the client (prerender-safe). */
export function useMobileJourneyMode() {
  const [mode, setMode] = useState<MobileJourneyMode>("scroll");
  // Last known mode is remembered so a return visit never flashes the other format while the setting loads.
  useLayoutEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("story")) { setMode("story"); return; }
    try { setMode(parseMobileJourneyMode(localStorage.getItem("journey-mode") ?? undefined)); } catch { /* ignore */ }
    let live = true;
    void loadJourneyMode().then((v) => { if (!live) return; setMode(v); try { localStorage.setItem("journey-mode", v); } catch { /* ignore */ } });
    return () => { live = false; };
  }, []);
  return mode;
}

export type DesktopJourneyMode = "scroll" | "carousel";
export const parseDesktopJourneyMode = (v: unknown): DesktopJourneyMode => (v === "carousel" ? "carousel" : "scroll");
let cachedDesktop: Promise<DesktopJourneyMode> | null = null;
/** Owner setting for computer home sections (site_settings.desktop_journey_mode); 'scroll' until loaded (prerender-safe). */
export function useDesktopJourneyMode() {
  const [mode, setMode] = useState<DesktopJourneyMode>("scroll");
  useLayoutEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("carousel")) { setMode("carousel"); return; }
    try { setMode(parseDesktopJourneyMode(localStorage.getItem("desktop-journey-mode") ?? undefined)); } catch { /* ignore */ }
    cachedDesktop ??= (async () => {
      const { data } = await supabase.from("site_settings").select("desktop_journey_mode").eq("id", "brand").maybeSingle();
      return parseDesktopJourneyMode((data as { desktop_journey_mode?: string } | null)?.desktop_journey_mode);
    })().catch(() => "scroll" as const);
    let live = true;
    void cachedDesktop.then((v) => { if (!live) return; setMode(v); try { localStorage.setItem("desktop-journey-mode", v); } catch { /* ignore */ } });
    return () => { live = false; };
  }, []);
  return mode;
}

let cachedMapModels: Promise<ReadonlySet<string>> | null = null;
/** Airplanes drawn as small 3D models on the maps (site_settings.map_3d_models/map_3d_aircraft). null until loaded after mount; failures turn it off. */
export function useMapModelRegs() {
  const [regs, setRegs] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    cachedMapModels ??= (async () => {
      const { data, error } = await supabase.from('site_settings').select('map_3d_models, map_3d_aircraft').eq('id', 'brand').maybeSingle();
      return error ? new Set<string>() : mapModelRegs(data?.map_3d_models, data?.map_3d_aircraft);
    })().catch(() => new Set<string>());
    let live = true;
    void cachedMapModels.then((v) => { if (live) setRegs(v); });
    return () => { live = false; };
  }, []);
  return regs;
}
