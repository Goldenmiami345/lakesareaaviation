// Pure helpers for the hybrid live-traffic readout: real ADS-B aircraft near each field
// (when any are broadcasting) plus live density-altitude / climb performance from METAR.
import { distanceNm } from "./wx-stations";
import { densityAltitude, climbScale, type Metar } from "./wx-conditions";

export type LiveAircraft = { id: string; altFt: number; kt: number; distNm: number; bearing: number };
export type AdsbRow = { hex?: string; flight?: string; r?: string; alt_baro?: number | "ground"; gs?: number; lat?: number; lon?: number };

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
    out.push({ id, altFt: Math.round(a.alt_baro / 100) * 100, kt: Math.round(a.gs ?? 0), distNm: Math.round(d * 10) / 10, bearing: Math.round(bearingDeg(field.lat, field.lon, a.lat, a.lon)) });
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
