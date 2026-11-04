import { createFileRoute } from "@tanstack/react-router";
import { WX_FIELDS } from "@/lib/wx-stations";
import { localTraffic, type AdsbRow, type LiveAircraft } from "@/lib/live-traffic";

// Public, read-only: nearby airborne ADS-B traffic for the three fixed school airports (adsb.lol open data).
// No caller input reaches the upstream request.
const ELEV: Record<keyof typeof WX_FIELDS, number> = { KLXL: 1123, "18V": 4953, P52: 3550 };
const TTL = 45_000;
let cache: { at: number; body: string } | null = null;

async function load() {
  const fields: Record<string, LiveAircraft[]> = {};
  await Promise.all(Object.entries(WX_FIELDS).map(async ([ident, f]) => {
    const res = await fetch(`https://api.adsb.lol/v2/point/${f.lat}/${f.lon}/12`, { headers: { "User-Agent": "LakesAreaAviation-site/1.0" } });
    if (!res.ok) throw new Error(`adsb ${res.status}`);
    const d = (await res.json()) as { ac?: AdsbRow[] };
    fields[ident] = localTraffic({ lat: f.lat, lon: f.lon, elevation: ELEV[ident as keyof typeof ELEV] }, d.ac ?? []);
  }));
  return JSON.stringify({ fetchedAt: Date.now(), fields });
}

export const Route = createFileRoute("/api/public/live-traffic")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        try {
          if (!cache || Date.now() - cache.at > TTL) {
            try { cache = { at: Date.now(), body: await load() }; } catch (e) { if (!cache) throw e; cache = { ...cache, at: Date.now() - TTL + 15_000 }; }
          }
          return new Response(cache.body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30, s-maxage=45" } });
        } catch {
          return Response.json({ error: "traffic unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
