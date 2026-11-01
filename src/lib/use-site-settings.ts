import { useEffect, useState } from "react";
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
