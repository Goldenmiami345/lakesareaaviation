import { useEffect, useState } from "react";

import type { Metar } from "./wx-conditions";
export type MetarObs = Metar;

// undefined = still loading, null = unavailable. Fetched after hydration only, so prerendered pages never wait on weather.
export function useMetar() {
  const [stations, setStations] = useState<Record<string, MetarObs> | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/public/metar")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { stations?: Record<string, MetarObs> }) => { if (!alive) return;
        // Dev/test hook: ?wxcat=IFR forces the flight category everywhere.
        const force = import.meta.env.DEV ? new URLSearchParams(location.search).get("wxcat") : null;
        const st = d.stations ?? null;
        setStations(st && force ? Object.fromEntries(Object.entries(st).map(([k, v]) => [k, { ...v, cat: force as NonNullable<MetarObs["cat"]> }])) as Record<string, MetarObs> : st); })
      .catch(() => { if (alive) setStations(null); });
    const t0 = window.setTimeout(load, 300);
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => { alive = false; window.clearTimeout(t0); window.clearInterval(id); };
  }, []);
  return stations;
}
