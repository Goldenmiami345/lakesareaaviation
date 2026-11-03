// Pure weather → flight-model helpers shared by the server METAR parser, the
// traffic simulation (aerial + oblique) and the HUD. No browser or network code.
import type { PatternAirport } from './traffic-pattern';

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
export type Metar = {
  station: string; dir: number | null; kt: number; gust: number | null; obsTime: number; raw: string;
  temp?: number | null; dewp?: number | null; altim?: number | null; visib?: number | null;
  /** Lowest BKN/OVC/VV base, ft AGL; null = no ceiling. */
  ceiling?: number | null; sky?: string | null; cat?: FlightCategory | null;
};

const D2R = Math.PI / 180;

/** Wind-correction (crab) angle, degrees, positive = nose right of track. Wind dir is FROM, true. */
export function crabAngle(tas: number, wind: { dir: number | null; kt: number } | null, trackTrue: number) {
  if (!wind || wind.dir === null || !wind.kt || tas <= 0) return 0;
  const cross = wind.kt * Math.sin((wind.dir - trackTrue) * D2R);
  return Math.asin(Math.max(-1, Math.min(1, cross / tas))) / D2R;
}

/** Density altitude (ft) from field elevation (ft), OAT (°C) and altimeter (inHg). */
export function densityAltitude(elevationFt: number, tempC: number, altimInHg: number) {
  const pa = elevationFt + (29.92 - altimInHg) * 1000;
  const isa = 15 - 2 * pa / 1000;
  return pa + 120 * (tempC - isa);
}

/** Climb-rate multiplier: −7% per 1,000 ft of DA above field elevation, floor 50%, cap 115% (cold). */
export function climbScale(densityAltFt: number, elevationFt: number) {
  return Math.max(0.5, Math.min(1.15, 1 - 0.07 * (densityAltFt - elevationFt) / 1000));
}

/** FAA flight category from ceiling (ft AGL) and visibility (SM). */
export function flightCategory(ceiling: number | null | undefined, visib: number | null | undefined): FlightCategory {
  const c = ceiling ?? Infinity, v = visib ?? Infinity;
  if (c < 500 || v < 1) return 'LIFR';
  if (c < 1000 || v < 3) return 'IFR';
  if (c <= 3000 || v <= 5) return 'MVFR';
  return 'VFR';
}

export type PatternMode = 'vfr' | 'mvfr' | 'ifr';
export function patternMode(cat: FlightCategory | null | undefined): PatternMode {
  return cat === 'IFR' || cat === 'LIFR' ? 'ifr' : cat === 'MVFR' ? 'mvfr' : 'vfr';
}
/** Max aircraft per mode. */
export const MODE_MAX_AIRCRAFT: Record<PatternMode, number> = { vfr: 3, mvfr: 2, ifr: 1 };

/** Applies the category profile: MVFR flies lower and closer in with ≤2 aircraft; IFR one straight-in. */
export function profileAirport<T extends PatternAirport>(a: T, mode: PatternMode): T {
  const aircraft = a.aircraft.slice(0, MODE_MAX_AIRCRAFT[mode]);
  if (mode === 'mvfr') return { ...a, aircraft, offset: a.offset * 0.8, extension: a.extension * 0.85, tpaAgl: Math.round(a.tpaAgl * 0.8 / 100) * 100 };
  return { ...a, aircraft };
}

/** Gust jitter (degrees, ≤2°, ~1.6 s period) on base/final only when gust spread > 5 kt. */
export function gustJitter(gustSpread: number, phase: string, agl: number, t: number) {
  if (gustSpread <= 5 || agl <= 0 || (phase !== 'Base' && phase !== 'Final')) return 0;
  const amp = Math.min(2, 0.8 + (gustSpread - 5) * 0.12);
  return amp * (0.7 * Math.sin(t * 2 * Math.PI / 1.6) + 0.3 * Math.sin(t * 2 * Math.PI / 1.1 + 1));
}

/** Solar elevation (deg) — NOAA low-precision formula, good to ~0.5°. */
export function sunElevation(lat: number, lon: number, date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5, n = jd - 2451545;
  const L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360 * D2R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R, eps = (23.439 - 4e-7 * n) * D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / D2R;
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const ha = ((gmst + lon - ra) % 360) * D2R;
  return Math.asin(Math.sin(lat * D2R) * Math.sin(dec) + Math.cos(lat * D2R) * Math.cos(dec) * Math.cos(ha)) / D2R;
}

export type TrafficConditions = { mode: PatternMode; climb: number; gust: number; night: boolean; approach: string | null; approachPx?: number; departPx?: number };
/** Published instrument approaches per FAA d-TPP (Nov 2026): KLXL RNAV (GPS) RWY 31, P52 RNAV (GPS) RWY 32; 18V none. */
export const PUBLISHED_APPROACHES: Record<string, Record<string, string>> = { KLXL: { '31': 'RNAV (GPS)' }, P52: { '32': 'RNAV (GPS)' } };
export function approachName(ident: string | undefined, runway: string) {
  const name = ident ? PUBLISHED_APPROACHES[ident]?.[runway] : undefined;
  return name ? `${name} ${runway}` : `PRACTICE APPROACH ${runway}`;
}
export const NO_CONDITIONS: TrafficConditions = { mode: 'vfr', climb: 1, gust: 0, night: false, approach: null };

export function trafficConditions(obs: Metar | null, field: { elevation: number; lat?: number; lon?: number; ident?: string }, runway: string, now = new Date()): TrafficConditions {
  if (!obs) return NO_CONDITIONS;
  const mode = patternMode(obs.cat);
  const da = obs.temp != null && obs.altim != null ? densityAltitude(field.elevation, obs.temp, obs.altim) : field.elevation;
  const night = field.lat != null && field.lon != null && sunElevation(field.lat, field.lon, now) < -0.833;
  return { mode, climb: climbScale(da, field.elevation), gust: obs.gust ? Math.max(0, obs.gust - obs.kt) : 0, night, approach: mode === 'ifr' ? approachName(field.ident, runway) : null };
}

const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');
const tC = (n: number) => (n < 0 ? `M${Math.abs(Math.round(n))}` : String(Math.round(n)));
/** "KLXL 2153Z · 160°/10G16 · 7°C/2°C · 30.02 · 10SM · BKN035 · VFR" */
export function metarSummary(m: Metar) {
  const d = new Date(m.obsTime * 1000);
  const z = `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
  const wind = m.kt === 0 ? 'Calm' : `${m.dir === null ? 'VRB' : pad3(m.dir) + '°'}/${m.kt}${m.gust ? `G${m.gust}` : ''}`;
  const parts = [`${m.station} ${z}`, wind];
  if (m.temp != null && m.dewp != null) parts.push(`${tC(m.temp)}°C/${tC(m.dewp)}°C`);
  if (m.altim != null) parts.push(m.altim.toFixed(2));
  if (m.visib != null) parts.push(`${m.visib >= 10 ? '10' : m.visib}SM`);
  if (m.sky) parts.push(m.sky);
  if (m.cat) parts.push(m.cat);
  return parts.join(' · ');
}
export function obsAge(obsTime: number, now = Date.now()) {
  const min = Math.max(0, Math.round((now / 1000 - obsTime) / 60));
  return min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} h ${min % 60} min ago`;
}

type Cloud = { cover: string; base?: number | null };
/** Parses one aviationweather.gov JSON row into the fields the site uses. */
export function parseMetarRow(r: { icaoId: string; wdir: number | string; wspd: number; wgst?: number | null; obsTime: number; rawOb: string; temp?: number | null; dewp?: number | null; altim?: number | null; visib?: number | string | null; clouds?: Cloud[] | null; fltCat?: string | null; vertVis?: number | null }): Metar {
  const a = /\bA(\d{4})\b/.exec(r.rawOb);
  const altim = a ? Number(a[1]) / 100 : typeof r.altim === 'number' ? Math.round(r.altim * 0.0295300 * 100) / 100 : null;
  const visib = typeof r.visib === 'number' ? r.visib : typeof r.visib === 'string' ? (parseFloat(r.visib) || null) : null;
  const clouds = r.clouds ?? [];
  const ceilingCloud = clouds.find((c) => (c.cover === 'BKN' || c.cover === 'OVC' || c.cover === 'OVX') && c.base != null);
  const ceiling = ceilingCloud?.base ?? (typeof r.vertVis === 'number' ? r.vertVis * (r.vertVis < 100 ? 100 : 1) : null);
  const lowest = ceilingCloud ?? clouds.find((c) => c.base != null);
  const sky = lowest?.base != null ? `${lowest.cover}${String(Math.round(lowest.base / 100)).padStart(3, '0')}` : clouds[0]?.cover ?? null;
  const known = ['VFR', 'MVFR', 'IFR', 'LIFR'] as const;
  const cat = (known as readonly string[]).includes(r.fltCat ?? '') ? (r.fltCat as FlightCategory) : flightCategory(ceiling, visib);
  return { station: r.icaoId, dir: typeof r.wdir === 'number' ? r.wdir : null, kt: r.wspd, gust: r.wgst ?? null, obsTime: r.obsTime, raw: r.rawOb, temp: r.temp ?? null, dewp: r.dewp ?? null, altim, visib, ceiling, sky, cat };
}

/** Distance (px) from `from` along unit `dir` to the inset edge of a viewBox "x y w h". */
export function distanceToEdge(viewBox: string, from: { x: number; y: number }, dir: { x: number; y: number }, inset = 0.06) {
  const [x = 0, y = 0, w = 0, h = 0] = viewBox.split(/[\s,]+/).map(Number);
  const l = x + w * inset, r = x + w * (1 - inset), t = y + h * inset, b = y + h * (1 - inset);
  let best = Infinity;
  if (dir.x > 1e-9) best = Math.min(best, (r - from.x) / dir.x); else if (dir.x < -1e-9) best = Math.min(best, (l - from.x) / dir.x);
  if (dir.y > 1e-9) best = Math.min(best, (b - from.y) / dir.y); else if (dir.y < -1e-9) best = Math.min(best, (t - from.y) / dir.y);
  return Math.max(0, best);
}
/** Straight-in legs that start/end at the visible map edge on the extended centreline. */
export function visibleApproach(a: Pick<PatternAirport, 'threshold' | 'end'>, viewBox: string) {
  const len = Math.hypot(a.end.x - a.threshold.x, a.end.y - a.threshold.y) || 1;
  const u = { x: (a.end.x - a.threshold.x) / len, y: (a.end.y - a.threshold.y) / len };
  return { approachPx: Math.max(40, distanceToEdge(viewBox, a.threshold, { x: -u.x, y: -u.y })), departPx: Math.max(40, distanceToEdge(viewBox, a.end, u)) };
}
