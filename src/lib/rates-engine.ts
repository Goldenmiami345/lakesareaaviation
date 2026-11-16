// Pure rates engine: published defaults (site-data.ts) + admin overrides (site_rates.config)
// -> the same data shapes and string formats the pages already render, so layout never changes.
import { instructionRates, otherRates, programs, rentalRates, type Program } from "./site-data";

export type RatesConfig = {
  rental?: Record<string, { regular: number; prepay: number }>;
  instruction?: Record<string, number>;
  other?: Record<string, string>;
  /** Course option name -> aircraft row (rentalRates[].aircraft) used for its rental hours. */
  assign?: Record<string, string>;
};

const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100000;

/** Drop anything malformed so a bad save can never break a page. */
export function cleanConfig(raw: unknown): RatesConfig {
  const c = (raw && typeof raw === "object" ? raw : {}) as RatesConfig;
  const out: RatesConfig = { rental: {}, instruction: {}, other: {}, assign: {} };
  for (const r of rentalRates) { const v = c.rental?.[r.aircraft]; if (v && ok(v.regular) && ok(v.prepay)) out.rental![r.aircraft] = { regular: v.regular, prepay: v.prepay }; }
  for (const r of instructionRates) { const v = c.instruction?.[r.label]; if (ok(v)) out.instruction![r.label] = v; }
  for (const r of otherRates) { const v = c.other?.[r.label]; if (typeof v === "string" && v.trim() && v.length <= 40) out.other![r.label] = v.trim(); }
  const names = new Set(rentalRates.map(r => r.aircraft));
  for (const [k, v] of Object.entries(c.assign ?? {})) if (typeof v === "string" && names.has(v)) out.assign![k] = v;
  return out;
}

export const DEFAULT_AIRCRAFT: Record<string, string> = { "Cessna 172": "Cessna 172", "Piper Apache": "Piper Apache PA-23-160" };
const INSTRUCTION_BY_SLUG: Record<string, string> = {
  "private-pilot": "Primary flight & ground instruction",
  "instrument-rating": "Instrument flight & ground instruction",
  "commercial-single-engine": "Commercial flight & ground instruction",
  "commercial-multi-engine": "Multi-engine flight & ground instruction",
  mei: "Multi-engine flight & ground instruction",
  "cfi-cfii": "Primary flight & ground instruction",
};
const LINE = /^(\d+(?:\.\d+)?) hours (.+?) at \$(\d+(?:\.\d+)?)\/hr: \$([\d,]+)$/;
const AIRCRAFT_LINE = /^(Cessna 172|Piper Apache) rental$/;

/** The published default aircraft for a course option, or null when it has no rental hours. */
export function defaultAircraftFor(lineItems: string[]) {
  for (const l of lineItems) { const m = LINE.exec(l); const a = m && AIRCRAFT_LINE.exec(m[2]!); if (a) return DEFAULT_AIRCRAFT[a[1]!]!; }
  return null;
}

export function applyRates(raw: unknown = {}) {
  const c = cleanConfig(raw);
  const rental = rentalRates.map(r => { const v = c.rental![r.aircraft]; return v ? { ...r, regular: usd(v.regular), prepay: usd(v.prepay) } : r; });
  const instruction = instructionRates.map(r => { const v = c.instruction![r.label]; return v !== undefined ? { ...r, rate: usd(v) } : r; });
  const other = otherRates.map(r => { const v = c.other![r.label]; return v ? { ...r, rate: v } : r; });
  const prepayOf = (aircraft: string) => num(rental.find(r => r.aircraft === aircraft)?.prepay ?? "0");
  const instrOf = (label: string) => num(instruction.find(r => r.label === label)?.rate ?? "0");

  const progs: Program[] = programs.map(p => ({ ...p, options: p.options.map(o => {
    let delta = 0;
    const assigned = c.assign![o.name];
    const lineItems = o.lineItems.map(line => {
      const m = LINE.exec(line); if (!m) return line;
      const hours = Number(m[1]); const what = m[2]!; const oldRate = Number(m[3]);
      const air = AIRCRAFT_LINE.exec(what);
      let rate = oldRate; let label = what;
      if (air) { const plane = assigned ?? DEFAULT_AIRCRAFT[air[1]!]!; rate = prepayOf(plane); if (assigned) label = `${plane} rental`; }
      else if (/instruction|ground school/i.test(what) && !/simulator/i.test(what) && INSTRUCTION_BY_SLUG[p.slug]) rate = instrOf(INSTRUCTION_BY_SLUG[p.slug]!);
      delta += hours * (rate - oldRate);
      return rate === oldRate && label === what ? line : `${hours} hours ${label} at $${rate}/hr: ${usd(hours * rate)}`;
    });
    const est = /^(.*?)\$([\d,]+)(.*)$/.exec(o.estimatedCost);
    const estimatedCost = delta && est ? `${est[1]}${usd(num(est[2]!) + delta)}${est[3]}` : o.estimatedCost;
    return { ...o, lineItems, estimatedCost };
  }) }));
  return { rentalRates: rental, instructionRates: instruction, otherRates: other, programs: progs, config: c };
}
export type AppliedRates = ReturnType<typeof applyRates>;

/** Course estimates that differ between two applied configs (for the admin impact preview). */
export function rateImpact(before: AppliedRates, after: AppliedRates) {
  const out: { program: string; option: string; from: string; to: string }[] = [];
  before.programs.forEach((p, i) => p.options.forEach((o, j) => {
    const to = after.programs[i]!.options[j]!.estimatedCost;
    if (to !== o.estimatedCost) out.push({ program: p.name, option: o.name, from: o.estimatedCost, to });
  }));
  return out;
}

const ESTIMATOR_OPTIONS: Record<string, string> = {
  private: "Accelerated Private Pilot", instrument: "Accelerated Instrument Rating", "commercial-single": "Commercial Single-Engine Land",
  "commercial-multi": "Commercial Multi-Engine Land", cfi: "Certified Flight Instructor", cfii: "Certified Flight Instructor–Instrument", mei: "Multi-Engine Flight Instructor",
};
/** Prices the training-plan estimator adds up, taken from the same applied rates as every page. */
export function estimatorPrices(r: AppliedRates) {
  const opts = r.programs.flatMap(p => p.options);
  const cost: Record<string, number> = {};
  for (const [id, name] of Object.entries(ESTIMATOR_OPTIONS)) cost[id] = num(opts.find(o => o.name === name)?.estimatedCost ?? "0");
  const other = (label: string, fallback: number) => num(r.otherRates.find(x => x.label === label)?.rate ?? "") || fallback;
  return { cost, housing: other("Student housing", 30), car: other("Student cars (housing residents)", 20), pickup: other("Airport pickup (MSP)", 125) };
}
