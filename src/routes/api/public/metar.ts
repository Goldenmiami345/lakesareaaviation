import { createFileRoute } from "@tanstack/react-router";

// Public, read-only: returns the latest METAR wind for a fixed list of stations.
// No caller input reaches the upstream request, so there is nothing private to protect.
const STATIONS = ["KLXL", "KDEN", "KSEZ"] as const;
const TTL = 10 * 60 * 1000;
const MAX_AGE_S = 2 * 60 * 60; // ignore observations older than 2 hours

type Obs = { station: string; dir: number | null; kt: number; gust: number | null; obsTime: number; raw: string };
let cache: { at: number; body: string } | null = null;

async function load(): Promise<string> {
  const url = `https://aviationweather.gov/api/data/metar?ids=${STATIONS.join(",")}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": "LakesAreaAviation-site/1.0" } });
  if (!res.ok) throw new Error(`aviationweather ${res.status}`);
  const rows = (await res.json()) as Array<{ icaoId: string; wdir: number | string; wspd: number; wgst?: number | null; obsTime: number; rawOb: string }>;
  const now = Date.now() / 1000;
  const stations: Record<string, Obs> = {};
  for (const r of rows) {
    if (!STATIONS.includes(r.icaoId as (typeof STATIONS)[number]) || typeof r.wspd !== "number" || now - r.obsTime > MAX_AGE_S) continue;
    if (stations[r.icaoId] && stations[r.icaoId]!.obsTime >= r.obsTime) continue;
    stations[r.icaoId] = { station: r.icaoId, dir: typeof r.wdir === "number" ? r.wdir : null, kt: r.wspd, gust: r.wgst ?? null, obsTime: r.obsTime, raw: r.rawOb };
  }
  return JSON.stringify({ fetchedAt: Date.now(), stations });
}

export const Route = createFileRoute("/api/public/metar")({
  server: {
    handlers: {
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > TTL) cache = { at: Date.now(), body: await load() };
          return new Response(cache.body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300, s-maxage=600" } });
        } catch {
          return Response.json({ error: "weather unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
