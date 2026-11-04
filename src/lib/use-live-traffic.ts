import { useEffect, useState } from "react";
import type { LiveAircraft } from "./live-traffic";

// undefined = loading, null = unavailable. After hydration only; polls every 60s while the tab is visible.
export function useLiveTraffic() {
  const [fields, setFields] = useState<Record<string, LiveAircraft[]> | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => { if (document.hidden) return; fetch("/api/public/live-traffic")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { fields?: Record<string, LiveAircraft[]> }) => { if (alive) setFields(d.fields ?? null); })
      .catch(() => { if (alive) setFields(null); }); };
    const t0 = window.setTimeout(load, 1200);
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearTimeout(t0); window.clearInterval(id); };
  }, []);
  return fields;
}
