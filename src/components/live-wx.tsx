import { useEffect, useState } from "react";
import { metarSummary, obsAge, type FlightCategory, type Metar } from "../lib/wx-conditions";

const CAT_CLASS: Record<FlightCategory, string> = { VFR: "wx-chip-vfr", MVFR: "wx-chip-mvfr", IFR: "wx-chip-ifr", LIFR: "wx-chip-lifr" };

export function CategoryChip({ cat }: { cat: FlightCategory }) {
  return <span className={`wx-chip ${CAT_CLASS[cat]}`}>{cat}</span>;
}

/** Re-renders once a minute so "12 min ago" stays current. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(id); }, []);
  return now;
}

/** One-line METAR summary + category chip + "Live METAR · n min ago" for the airport HUD. */
export function MetarLine({ obs }: { obs: Metar }) {
  const now = useNow();
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 normal-case tracking-[0.06em]" data-metar>
      {obs.cat && <CategoryChip cat={obs.cat} />}
      <span className="text-background">{metarSummary(obs).replace(/ · (VFR|MVFR|IFR|LIFR)$/, "")}</span>
      <span className="text-background/60">Live METAR · {obsAge(obs.obsTime, now)}</span>
    </span>
  );
}

const CAPTION: Record<"VFR" | "MVFR" | "IFR", string> = {
  VFR: "VMC at Little Falls right now — hood work and the sim.",
  MVFR: "Marginal VMC at Little Falls — low ceilings, real IMC practice.",
  IFR: "IMC at Little Falls right now — actual instrument conditions.",
};

/** Instrument-rating stage: live Little Falls conditions. Reserves its height while loading; collapses when weather is unavailable. */
export function InstrumentConditions({ obs, loading }: { obs: Metar | null; loading: boolean }) {
  if (!obs?.cat) return loading ? <div aria-hidden className="wx-instrument-slot mt-2" /> : null;
  const key = obs.cat === "LIFR" ? "IFR" : obs.cat;
  const spread = obs.temp != null && obs.dewp != null ? Math.round(obs.temp - obs.dewp) : null;
  const parts = [
    obs.ceiling != null ? `CIG ${obs.ceiling.toLocaleString("en-US")} ft` : "No ceiling",
    obs.visib != null ? `VIS ${obs.visib >= 10 ? "10+" : obs.visib} SM` : null,
    obs.temp != null && obs.dewp != null ? `${Math.round(obs.temp)}°/${Math.round(obs.dewp)}°C · spread ${spread}°` : null,
  ].filter(Boolean);
  return (
    <div className="wx-instrument-slot mt-2 font-mono text-xs" data-instrument-wx aria-live="polite">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-background">
        <CategoryChip cat={obs.cat} /><span>KLXL · {parts.join(" · ")}</span>
      </p>
      <p className="mt-1 text-background/80">{CAPTION[key]}</p>
    </div>
  );
}
