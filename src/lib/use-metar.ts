import { useEffect, useState } from "react";

export type MetarObs = { station: string; dir: number | null; kt: number; gust: number | null; obsTime: number; raw: string };

// Fetched after hydration only, so prerendered pages never wait on weather.
export function useMetar() {
  const [stations, setStations] = useState<Record<string, MetarObs> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/public/metar")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { stations?: Record<string, MetarObs> }) => { if (alive) setStations(d.stations ?? null); })
      .catch(() => { if (alive) setStations(null); });
    const t0 = window.setTimeout(load, 300);
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => { alive = false; window.clearTimeout(t0); window.clearInterval(id); };
  }, []);
  return stations;
}
