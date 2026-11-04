import { createFileRoute } from "@tanstack/react-router";
import { WX_FIELDS } from "@/lib/wx-stations";
import { localTraffic, type AdsbRow, type LiveAircraft } from "@/lib/live-traffic";

// Public, read-only: nearby airborne ADS-B traffic for the three fixed school airports (adsb.lol open data).
// No caller input reaches the upstream request.
const ELEV: Record<keyof typeof WX_FIELDS, number> = { KLXL: 1123, "18V": 4953, P52: 3550 };
const TTL = 8_000;
// Origin/destination per callsign (adsb.lol route database), cached 10 min; most GA flights have none.
const routes = new Map<string, { at: number; origin?: string; destination?: string }>();
async function addRoutes(list: LiveAircraft[]) {
  const need = list.filter((a) => a.callsign && !(routes.get(a.callsign) && Date.now() - routes.get(a.callsign)!.at < 600_000));
  if (need.length) {
    try {
      const res = await fetch("https://api.adsb.lol/api/0/routeset", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "LakesAreaAviation-site/1.0" }, body: JSON.stringify({ planes: need.map((a) => ({ callsign: a.callsign, lat: a.lat, lng: a.lon })) }), signal: AbortSignal.timeout(3000) });
      const rows = res.ok ? ((await res.json()) as { callsign?: string; _airport_codes_iata?: string; airport_codes?: string }[]) : [];
      for (const a of need) {
        const r = rows.find((x) => x.callsign?.toUpperCase() === a.callsign);
        const codes = (r?.airport_codes || r?._airport_codes_iata || "").split("-").filter((c) => c && c !== "unknown");
        routes.set(a.callsign!, { at: Date.now(), ...(codes.length >= 2 ? { origin: codes[0], destination: codes[codes.length - 1] } : {}) });
      }
    } catch { /* routes are optional */ }
  }
  for (const a of list) { const r = a.callsign ? routes.get(a.callsign) : undefined; if (r?.origin) { a.origin = r.origin; a.destination = r.destination; } }
}
let cache: { at: number; body: string } | null = null;

async function load() {
  const fields: Record<string, LiveAircraft[]> = {};
  await Promise.all(Object.entries(WX_FIELDS).map(async ([ident, f]) => {
    const res = await fetch(`https://api.adsb.lol/v2/point/${f.lat}/${f.lon}/12`, { headers: { "User-Agent": "LakesAreaAviation-site/1.0" } });
    if (!res.ok) throw new Error(`adsb ${res.status}`);
    const d = (await res.json()) as { ac?: AdsbRow[]; now?: number };
    const now = Date.now();
    const rows = d.ac ?? [];
    const list = localTraffic({ lat: f.lat, lon: f.lon, elevation: ELEV[ident as keyof typeof ELEV] }, rows);
    for (const a of list) { const r = rows.find((x) => x.hex?.trim().toLowerCase() === a.hex); a.t = now - Math.round((r?.seen_pos ?? 0) * 1000); }
    await addRoutes(list);
    fields[ident] = list;
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
          return new Response(cache.body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=5, s-maxage=8" } });
        } catch {
          return Response.json({ error: "traffic unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
