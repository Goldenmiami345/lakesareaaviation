import { parseMobileJourneyMode, type MobileJourneyMode } from "./story-nav";
import { useEffect, useLayoutEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

let cachedFleet: Promise<boolean> | null = null;
/** Owner setting site_settings.fleet_show_models; false (photos) until loaded on the client, so prerender shows photos. */
export function useFleetShowModels() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    cachedFleet ??= (async () => {
      const { data } = await supabase.from("site_settings").select("fleet_show_models").eq("id", "brand").maybeSingle();
      return Boolean((data as { fleet_show_models?: boolean } | null)?.fleet_show_models);
    })().catch(() => false);
    let live = true; void cachedFleet.then((v) => { if (live) setShow(v); }); return () => { live = false; };
  }, []);
  return show;
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
