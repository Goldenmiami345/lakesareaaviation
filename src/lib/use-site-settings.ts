import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Owner toggle (site_settings.show_traffic_pattern, default false). Read after mount
// only, so prerendered HTML never contains the drawn pattern.
let cached: Promise<boolean> | null = null;
function loadShowPattern() {
  cached ??= (async () => {
    const { data } = await supabase.from("site_settings").select("show_traffic_pattern").eq("id", "brand").maybeSingle();
    return (data as { show_traffic_pattern?: boolean } | null)?.show_traffic_pattern === true;
  })().catch(() => false);
  return cached;
}
export function useShowTrafficPattern() {
  const [show, setShow] = useState(false);
  useEffect(() => { let live = true; void loadShowPattern().then((v) => { if (live) setShow(v); }); return () => { live = false; }; }, []);
  return show;
}
