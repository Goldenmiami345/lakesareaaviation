// Small real-time 3D airplanes on the traffic maps (site_settings.map_3d_models +
// map_3d_aircraft). Separate from the info-card switch (show_3d_models).
export const MAP_MODEL_AIRCRAFT = [
  { reg: 'N8570B', name: 'Phoenix' },
  { reg: 'N4383P', name: 'Apache' },
  { reg: 'N46201', name: 'Cardinal' },
] as const;
const KNOWN: readonly string[] = MAP_MODEL_AIRCRAFT.map((a) => a.reg);
/** Registrations that fly as 3D on the maps. Anything but an explicit `true` switch yields none. */
export function mapModelRegs(enabled: unknown, regs: unknown): ReadonlySet<string> {
  if (enabled !== true || !Array.isArray(regs)) return new Set();
  return new Set(regs.filter((r): r is string => typeof r === 'string' && KNOWN.includes(r)));
}
/** Lightweight map copies (simplified, 512px paint), packed from models-src. */
export const mapModelUrl = (reg: string) => (KNOWN.includes(reg) ? `/models/map/${reg}.glb?v=2` : null);
/** Bank angle (radians) for a coordinated turn at `turnDegPerSec`, exaggerated slightly so it reads at map size. */
export function bankFor(turnDegPerSec: number, speedMs = 46) {
  const w = (turnDegPerSec * Math.PI) / 180;
  const bank = Math.atan((speedMs * w) / 9.81) * 1.4;
  const max = (35 * Math.PI) / 180;
  return Math.max(-max, Math.min(max, bank));
}
