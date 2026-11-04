import { useEffect, useState } from "react";
import type { LiveAircraft } from "./live-traffic";

// undefined = loading, null = unavailable. After hydration only; polls while the tab is visible.
export function useLiveTraffic(intervalMs = 60_000, enabled = true) {
  const [fields, setFields] = useState<Record<string, LiveAircraft[]> | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => { if (document.hidden) return; fetch("/api/public/live-traffic")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { fields?: Record<string, LiveAircraft[]> }) => { if (alive) setFields(d.fields ?? null); })
      .catch(() => { if (alive) setFields(null); }); };
    const t0 = window.setTimeout(load, 1200);
    const id = window.setInterval(load, intervalMs);
    return () => { alive = false; window.clearTimeout(t0); window.clearInterval(id); };
  }, [intervalMs, enabled]);
  return fields;
}
