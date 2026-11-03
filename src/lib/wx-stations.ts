// Each airport's wind comes from the nearest station with a current METAR, chosen by
// great-circle distance from the field's FAA reference point. `fallback` is used when no
// nearby station has a current report.
export const WX_FIELDS = {
  KLXL: { lat: 45.9497, lon: -94.3473, fallback: "KLXL" },
  "18V": { lat: 40.0999, lon: -104.7012, fallback: "KDEN" },
  P52: { lat: 34.7298, lon: -112.0352, fallback: "KSEZ" },
} as const;
export const WX_SEARCH_DEG = 0.6; // bbox half-size (~36 nm) searched around each field

export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestStation<T extends { lat: number; lon: number }>(field: { lat: number; lon: number }, rows: readonly T[]): T | null {
  let best: T | null = null, bestD = Infinity;
  for (const row of rows) { const d = distanceNm(field.lat, field.lon, row.lat, row.lon); if (d < bestD) { bestD = d; best = row; } }
  return best;
}
