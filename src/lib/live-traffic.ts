// Pure helpers for the hybrid live-traffic readout: real ADS-B aircraft near each field
// (when any are broadcasting) plus live density-altitude / climb performance from METAR.
import { distanceNm } from "./wx-stations";
import { densityAltitude, climbScale, type Metar } from "./wx-conditions";

export type LiveAircraft = {
  id: string; altFt: number; kt: number; distNm: number; bearing: number;
  // Optional detail for the live map view (absent in older payloads).
  hex?: string; callsign?: string; type?: string; desc?: string; lat?: number; lon?: number;
  track?: number; vs?: number; t?: number; origin?: string; destination?: string;
};
export type AdsbRow = { hex?: string; flight?: string; r?: string; t?: string; desc?: string; alt_baro?: number | "ground"; gs?: number; lat?: number; lon?: number; track?: number; baro_rate?: number; seen_pos?: number };

export const LIVE_RADIUS_NM = 10;
export const LIVE_CEILING_AGL = 6000;

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180, y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}

/** Airborne local traffic only: within LIVE_RADIUS_NM and below field + LIVE_CEILING_AGL, nearest first. */
export function localTraffic(field: { lat: number; lon: number; elevation: number }, rows: readonly AdsbRow[]): LiveAircraft[] {
  const out: LiveAircraft[] = [];
  for (const a of rows) {
    if (typeof a.lat !== "number" || typeof a.lon !== "number" || typeof a.alt_baro !== "number") continue;
    if (a.alt_baro > field.elevation + LIVE_CEILING_AGL || a.alt_baro < field.elevation + 100) continue;
    const d = distanceNm(field.lat, field.lon, a.lat, a.lon);
    if (d > LIVE_RADIUS_NM) continue;
    const id = (a.r || a.flight || a.hex || "").trim().toUpperCase();
    if (!id) continue;
    const row: LiveAircraft = { id, altFt: Math.round(a.alt_baro / 100) * 100, kt: Math.round(a.gs ?? 0), distNm: Math.round(d * 10) / 10, bearing: Math.round(bearingDeg(field.lat, field.lon, a.lat, a.lon)), lat: a.lat, lon: a.lon, track: a.track ?? 0, vs: a.baro_rate ?? 0 };
    if (a.hex) row.hex = a.hex.trim().toLowerCase();
    if (a.flight?.trim()) row.callsign = a.flight.trim().toUpperCase();
    if (a.t) row.type = a.t;
    if (a.desc) row.desc = a.desc;
    out.push(row);
  }
  return out.sort((p, q) => p.distNm - q.distNm).slice(0, 5);
}

/** Trainer baseline climb (≈ sea-level standard day), scaled by live density altitude. */
export const BASE_CLIMB_FPM = 720;
export function livePerformance(obs: Metar | null | undefined, elevation: number) {
  if (!obs || typeof obs.temp !== "number" || typeof obs.altim !== "number") return null;
  const da = densityAltitude(elevation, obs.temp, obs.altim);
  // Climb falls ~7% per 1,000 ft of density altitude above sea level.
  const fpm = BASE_CLIMB_FPM * climbScale(da, 0);
  return { da: Math.round(da / 10) * 10, fpm: Math.round(fpm / 10) * 10 };
}

/** Live map view switches on only for real aircraft in or near the pattern: within 4 nm and below 3,000 ft AGL. */
export const PATTERN_RADIUS_NM = 4;
export const PATTERN_CEILING_AGL = 3000;
export function patternTraffic(list: readonly LiveAircraft[] | null | undefined, elevation: number) {
  return (list ?? []).filter((a) => typeof a.lat === "number" && typeof a.lon === "number" && a.distNm <= PATTERN_RADIUS_NM && a.altFt - elevation <= PATTERN_CEILING_AGL);
}
/** Public tracker page for one airplane (the same open ADS-B network the data comes from). */
export const trackerUrl = (a: Pick<LiveAircraft, "hex" | "id">) => a.hex ? `https://globe.adsb.lol/?icao=${encodeURIComponent(a.hex)}` : `https://globe.adsb.lol/?reg=${encodeURIComponent(a.id)}`;
/** Dead-reckon a report forward along its track (capped at 30 s so stale data never flies off). */
export function deadReckon(a: { lat: number; lon: number; kt: number; track: number }, seconds: number) {
  const s = Math.max(0, Math.min(30, seconds)), m = a.kt * 0.514444 * s, t = (a.track * Math.PI) / 180;
  return { lat: a.lat + (Math.cos(t) * m) / 110_540, lon: a.lon + (Math.sin(t) * m) / (111_320 * Math.cos((a.lat * Math.PI) / 180)) };
}
