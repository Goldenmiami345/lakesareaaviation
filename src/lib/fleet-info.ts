import { fleet, type FleetRole } from "./site-data";

export type Plane = (typeof fleet)[number];

export const ROLE_LABEL: Record<FleetRole, string> = { trainer: "Trainer", twin: "Twin", tailwheel: "Tailwheel" };

// Training each airplane supports, taken from the published program pages.
export const TRAINING: Record<FleetRole, { label: string; to: string }[]> = {
  trainer: [
    { label: "Private Pilot", to: "/programs/private-pilot" },
    { label: "Instrument Rating", to: "/programs/instrument-rating" },
    { label: "Commercial Single-Engine", to: "/programs/commercial-single-engine" },
    { label: "CFI & CFII", to: "/programs/cfi-cfii" },
  ],
  twin: [
    { label: "Commercial Multi-Engine", to: "/programs/commercial-multi-engine" },
    { label: "Multi-Engine Instructor", to: "/programs/mei" },
  ],
  tailwheel: [{ label: "Specialized training", to: "/specialized-training" }],
};

export const ENDORSEMENTS: Record<FleetRole, string[]> = {
  trainer: [],
  twin: ["Multi-engine class rating (Commercial Multi-Engine)", "Multi-engine instructor (MEI)"],
  tailwheel: ["Tailwheel endorsement"],
};

/** URL segment for an airplane page: the lowercase tail number (/fleet/n8570b). */
export const planeSlug = (p: Pick<Plane, "registration">) => p.registration.toLowerCase();
export const findPlane = (slug: string) => fleet.find((p) => planeSlug(p) === slug.toLowerCase());

/** Heading for an airplane: tail number plus nickname when it has one ("N8570B Phoenix"). */
export const planeTitle = (p: Plane) => (p.nickname ? `${p.registration} ${p.nickname}` : p.registration);

export function keyStats(f: Plane) {
  const s = f.specs ?? {};
  return [
    f.rate ? { k: "Wet rate", v: f.rate } : null,
    s["Seats"] ? { k: "Seats", v: s["Seats"] } : null,
    s["Horsepower"] ? { k: "HP", v: s["Horsepower"] } : null,
    s["GPS"] ? { k: "Avionics", v: s["GPS"] } : s["IFR/VFR"] ? { k: "Rules", v: s["IFR/VFR"] } : null,
  ].filter(Boolean).slice(0, 4) as { k: string; v: string }[];
}
