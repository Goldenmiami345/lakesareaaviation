// Pure rates engine: published defaults (site-data.ts) + admin overrides (site_rates.config)
// -> the same data shapes and string formats the pages already render, so layout never changes.
import { instructionRates, otherRates, programs, rentalRates, type Program } from "./site-data";

export type RatesConfig = {
  rental?: Record<string, { regular: number; prepay: number }>;
  instruction?: Record<string, number>;
  other?: Record<string, string>;
  /** Course option name -> aircraft row (rentalRates[].aircraft) used for its rental hours. */
  assign?: Record<string, string>;
  /** Rental-rate lines the owner added (a new airplane, or one airplane given its own price). */
  extraRental?: ExtraRental[];
  /** Published rate line -> the airplanes listed under it on the Rates page. */
  names?: Record<string, string>;
  /** Course option name -> { line index -> hours } for its worked-out lines. */
  hours?: Record<string, Record<string, number>>;
  /** Course option name -> course fee in dollars. */
  fee?: Record<string, number>;
};
/** twin: priced as a multi-engine airplane (only twins can price a multi-engine course). */
export type ExtraRental = { aircraft: string; names: string; regular: number; prepay: number; twin?: boolean };

const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100000;

/** Drop anything malformed so a bad save can never break a page. */
export function cleanConfig(raw: unknown): RatesConfig {
  const c = (raw && typeof raw === "object" ? raw : {}) as RatesConfig;
  const out: RatesConfig = { rental: {}, instruction: {}, other: {}, assign: {} };
  const extra: ExtraRental[] = [];
  const baseNames = new Set(rentalRates.map(r => r.aircraft));
  for (const e of Array.isArray(c.extraRental) ? c.extraRental : []) {
    const a = typeof e?.aircraft === "string" ? e.aircraft.trim() : "";
    if (!a || a.length > 60 || /\|/.test(a) || baseNames.has(a) || extra.some(x => x.aircraft === a) || !ok(e.regular) || !ok(e.prepay)) continue;
    extra.push({ aircraft: a, names: typeof e.names === "string" ? e.names.trim().slice(0, 80) : "", regular: e.regular, prepay: e.prepay, ...(e.twin === true ? { twin: true } : {}) });
  }
  if (extra.length) out.extraRental = extra;
  for (const r of rentalRates) { const v = c.names?.[r.aircraft]; if (typeof v === "string" && v.trim() && v.length <= 80) (out.names ??= {})[r.aircraft] = v.trim(); }
  const allOptions = programs.flatMap(p => p.options);
  for (const [name, m] of Object.entries(c.hours && typeof c.hours === "object" ? c.hours : {})) {
    const o = allOptions.find(x => x.name === name); if (!o || !m || typeof m !== "object") continue;
    for (const [i, h] of Object.entries(m)) if (LINE.test(o.lineItems[Number(i)] ?? "") && typeof h === "number" && Number.isFinite(h) && h > 0 && h <= 500) ((out.hours ??= {})[name] ??= {})[i] = Math.round(h * 10) / 10;
  }
  for (const [name, v] of Object.entries(c.fee && typeof c.fee === "object" ? c.fee : {})) {
    const o = allOptions.find(x => x.name === name);
    if (o && o.lineItems.some(l => FEE_LINE.test(l)) && ok(v)) (out.fee ??= {})[name] = Math.round(v);
  }
  for (const r of rentalRates) { const v = c.rental?.[r.aircraft]; if (v && ok(v.regular) && ok(v.prepay)) out.rental![r.aircraft] = { regular: v.regular, prepay: v.prepay }; }
  for (const r of instructionRates) { const v = c.instruction?.[r.label]; if (ok(v)) out.instruction![r.label] = v; }
  for (const r of otherRates) { const v = c.other?.[r.label]; if (typeof v === "string" && v.trim() && v.length <= 40) out.other![r.label] = v.trim(); }
  const names = new Set([...rentalRates.map(r => r.aircraft), ...extra.map(e => e.aircraft)]);
  for (const [k, v] of Object.entries(c.assign ?? {})) {
    if (typeof v !== "string" || !names.has(v)) continue;
    const o = programs.flatMap(p => p.options).find(x => x.name === k);
    const d = o ? defaultAircraftFor(o.lineItems) : null;
    if (d && isMultiEngineLine(v, extra) !== isMultiEngineLine(d)) continue; // never a twin for a single-engine course, or the reverse
    out.assign![k] = v;
  }
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
const FEE_LINE = /^Course fee: \$([\d,]+)$/;
const AIRCRAFT_LINE = /^(Cessna 172|Piper Apache) rental$/;

/** Twin-engine rental lines. A single-engine course can only be priced with a single-engine
 *  airplane and a multi-engine course only with a twin, so the picker and saved config both enforce it. */
const MULTI_ENGINE_LINES = new Set(["Piper Apache PA-23-160"]);
export const isMultiEngineLine = (aircraft: string, extra: ExtraRental[] = []) => MULTI_ENGINE_LINES.has(aircraft) || extra.some(e => e.aircraft === aircraft && e.twin === true);
/** Rental lines an owner may price a course option with: same engine class as its published
 *  airplane, including lines that give one airplane its own price. */
export function aircraftChoicesFor(lineItems: string[], extra: ExtraRental[] = []) {
  const d = defaultAircraftFor(lineItems); if (!d) return [];
  return [...rentalRates.map(r => r.aircraft), ...extra.map(e => e.aircraft)].filter(a => isMultiEngineLine(a, extra) === isMultiEngineLine(d));
}

/** The published default aircraft for a course option, or null when it has no rental hours. */
export function defaultAircraftFor(lineItems: string[]) {
  for (const l of lineItems) { const m = LINE.exec(l); const a = m && AIRCRAFT_LINE.exec(m[2]!); if (a) return DEFAULT_AIRCRAFT[a[1]!]!; }
  return null;
}

export function applyRates(raw: unknown = {}) {
  const c = cleanConfig(raw);
  const rental = [...rentalRates.map(r => { const v = c.rental![r.aircraft]; const names = c.names?.[r.aircraft]; const out = v ? { ...r, regular: usd(v.regular), prepay: usd(v.prepay) } : r; return names ? { ...out, names } : out; }),
    ...(c.extraRental ?? []).map(e => ({ aircraft: e.aircraft, names: e.names, regular: usd(e.regular), prepay: usd(e.prepay), added: true as const }))];
  const instruction = instructionRates.map(r => { const v = c.instruction![r.label]; return v !== undefined ? { ...r, rate: usd(v) } : r; });
  const other = otherRates.map(r => { const v = c.other![r.label]; return v ? { ...r, rate: v } : r; });
  const prepayOf = (aircraft: string) => num(rental.find(r => r.aircraft === aircraft)?.prepay ?? "0");
  const instrOf = (label: string) => num(instruction.find(r => r.label === label)?.rate ?? "0");

  const progs: Program[] = programs.map(p => {
    // "40 hours Cessna 172 rental" summary lines follow hour and airplane changes too.
    const renamed = new Map<string, string>();
    const options = p.options.map(o => {
      let delta = 0;
      const assigned = c.assign![o.name];
      const hoursOf = c.hours?.[o.name] ?? {};
      const fee = c.fee?.[o.name];
      const lineItems = o.lineItems.map((line, i) => {
        const f = FEE_LINE.exec(line);
        if (f) { if (fee === undefined) return line; delta += fee - num(f[1]!); return `Course fee: ${usd(fee)}`; }
        const m = LINE.exec(line); if (!m) return line;
        const oldHours = Number(m[1]); const hours = hoursOf[i] ?? oldHours; const what = m[2]!; const oldRate = Number(m[3]);
        const air = AIRCRAFT_LINE.exec(what);
        let rate = oldRate; let label = what;
        if (air) { const plane = assigned ?? DEFAULT_AIRCRAFT[air[1]!]!; rate = prepayOf(plane); if (assigned) label = `${plane} rental`; }
        else if (/instruction|ground school/i.test(what) && !/simulator/i.test(what) && INSTRUCTION_BY_SLUG[p.slug]) rate = instrOf(INSTRUCTION_BY_SLUG[p.slug]!);
        delta += hours * rate - oldHours * oldRate;
        if (hours !== oldHours || label !== what) renamed.set(`${oldHours} hours ${what}`, `${hours} hours ${label}`);
        return rate === oldRate && label === what && hours === oldHours ? line : `${hours} hours ${label} at $${rate}/hr: ${usd(hours * rate)}`;
      });
      const est = /^(.*?)\$([\d,]+)(.*)$/.exec(o.estimatedCost);
      const estimatedCost = delta && est ? `${est[1]}${usd(num(est[2]!) + delta)}${est[3]}` : o.estimatedCost;
      return { ...o, lineItems, estimatedCost };
    });
    return renamed.size ? { ...p, options, details: p.details.map(d => renamed.get(d) ?? d) } : { ...p, options };
  });
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

// ---- Visual editor: every price on the site is one of these rate spots, so a change typed
// anywhere (rates table, fleet card, course page) updates every page and course that uses it.
export const rateKey = {
  rental: (aircraft: string, field: "regular" | "prepay") => `rate|rental|${aircraft}|${field}`,
  instruction: (label: string) => `rate|instruction|${label}`,
  other: (label: string) => `rate|other|${label}`,
  assign: (option: string) => `rate|assign|${option}`,
  /** A new rental-rate line; the value is JSON {names, regular, prepay, twin?}. */
  newRow: (aircraft: string) => `rate|newrow|${aircraft}`,
  /** The airplanes listed under a published rate line. */
  names: (aircraft: string) => `rate|names|${aircraft}`,
  /** Hours on one worked-out line of a course option (index in its lineItems). */
  hours: (option: string, index: number) => `rate|hours|${option}|${index}`,
  fee: (option: string) => `rate|fee|${option}`,
};
export const usdOf = usd;
export const numOf = num;
export const isRateKey = (k: string) => k.startsWith("rate|");
/** Which rental-rate row prices each airplane in the fleet. */
export const FLEET_RATE_ROW: Record<string, string> = {
  N8570B: "Cessna 172", N6717A: "Cessna 172", N46201: "Cessna 172I / 172K", N7108G: "Cessna 172I / 172K",
  N4383P: "Piper Apache PA-23-160", N6641F: "Cessna 150", N96150: "Taylorcraft BC-12D",
};
/** "$185/hr"-style fleet rates from the live rental table (undefined when the airplane has no published rate). */
export function fleetRate(r: AppliedRates, registration: string, rateRow: string | undefined = FLEET_RATE_ROW[registration]) {
  const row = r.rentalRates.find(x => x.aircraft === rateRow);
  return row ? { row: row.aircraft, rate: `${row.regular}/hr`, prepay: `${row.prepay}/hr` } : undefined;
}
/** Parsed "N hours X at $R/hr: $T" lines are worked out from the rates, not typed. */
export const isCalculatedLine = (line: string) => LINE.test(line);

const parts = (k: string) => { const [p, kind, name, field] = k.split("|"); return p === "rate" ? { kind, name: name ?? "", field } : null; };
/** The price a rate spot shows right now ("$185", "$30/night", or the assigned aircraft). */
export function rateValue(r: AppliedRates, key: string): string {
  const k = parts(key); if (!k) return "";
  if (k.kind === "rental") { const row = r.rentalRates.find(x => x.aircraft === k.name); return row ? (k.field === "prepay" ? row.prepay : row.regular) : ""; }
  if (k.kind === "instruction") return r.instructionRates.find(x => x.label === k.name)?.rate ?? "";
  if (k.kind === "other") return r.otherRates.find(x => x.label === k.name)?.rate ?? "";
  if (k.kind === "assign") { const o = programs.flatMap(p => p.options).find(x => x.name === k.name); return r.config.assign?.[k.name] ?? (o ? defaultAircraftFor(o.lineItems) ?? "" : ""); }
  if (k.kind === "hours") { const o = r.programs.flatMap(p => p.options).find(x => x.name === k.name); const m = o && LINE.exec(o.lineItems[Number(k.field)] ?? ""); return m ? m[1]! : ""; }
  if (k.kind === "fee") { const o = r.programs.flatMap(p => p.options).find(x => x.name === k.name); const m = o?.lineItems.map(l => FEE_LINE.exec(l)).find(Boolean); return m ? m[1]!.replace(/,/g, "") : ""; }
  if (k.kind === "names") return r.rentalRates.find(x => x.aircraft === k.name)?.names ?? "";
  return "";
}
export function rateLabel(key: string) {
  const k = parts(key); if (!k) return "Rate";
  if (k.kind === "rental") return `${k.name}: ${k.field === "prepay" ? "prepay" : "regular"} rate per hour`;
  if (k.kind === "instruction") return `${k.name}: rate per hour`;
  if (k.kind === "assign") return `${k.name}: rental aircraft`;
  if (k.kind === "hours") return `${k.name}: hours`;
  if (k.kind === "fee") return `${k.name}: course fee`;
  if (k.kind === "names") return `${k.name}: airplanes on this line`;
  return `${k.name}: price`;
}
const typedNumber = (v: string) => { const t = v.replace(/[$,\s]/g, ""); if (!/^\d+(\.\d+)?$/.test(t)) return null; const n = Number(t); return ok(n) ? n : null; };

/** Saved rates plus the visual editor's unsaved rate edits. Entries equal to the published
 *  defaults are dropped, so undoing a change leaves nothing behind. */
export function withRateDrafts(raw: unknown, drafts: Record<string, string>): RatesConfig {
  const c = cleanConfig(raw);
  for (const [key, v] of Object.entries(drafts)) {
    const k = parts(key); if (!k || !k.name) continue;
    if (k.kind === "newrow") {
      try { const e = JSON.parse(v) as Partial<ExtraRental>; c.extraRental = [...(c.extraRental ?? []).filter(x => x.aircraft !== k.name), { aircraft: k.name, names: String(e.names ?? ""), regular: Number(e.regular), prepay: Number(e.prepay), ...(e.twin === true ? { twin: true } : {}) }]; } catch { /* ignore */ }
      continue;
    }
    if (k.kind === "rental" && (k.field === "regular" || k.field === "prepay")) {
      const ex = c.extraRental?.find(x => x.aircraft === k.name);
      if (ex) { const n = typedNumber(v); if (n !== null) ex[k.field] = n; continue; }
      const row = rentalRates.find(x => x.aircraft === k.name); const n = typedNumber(v); if (!row || n === null) continue;
      const prev = c.rental![k.name] ?? { regular: num(row.regular), prepay: num(row.prepay) };
      c.rental![k.name] = { ...prev, [k.field]: n };
    } else if (k.kind === "instruction") { const n = typedNumber(v); if (n !== null && instructionRates.some(x => x.label === k.name)) c.instruction![k.name] = n; }
    else if (k.kind === "other") { if (otherRates.some(x => x.label === k.name) && v.trim()) c.other![k.name] = v.trim(); }
    else if (k.kind === "assign") c.assign![k.name] = v;
    else if (k.kind === "names") { if (rentalRates.some(x => x.aircraft === k.name) && v.trim()) (c.names ??= {})[k.name] = v.trim(); }
    else if (k.kind === "hours") { const n = typedNumber(v); if (n !== null && k.field !== undefined) ((c.hours ??= {})[k.name] ??= {})[k.field] = n; }
    else if (k.kind === "fee") { const n = typedNumber(v); if (n !== null) (c.fee ??= {})[k.name] = n; }
  }
  const out = cleanConfig(c);
  for (const r of rentalRates) { const v = out.rental![r.aircraft]; if (v && v.regular === num(r.regular) && v.prepay === num(r.prepay)) delete out.rental![r.aircraft]; }
  for (const r of instructionRates) if (out.instruction![r.label] === num(r.rate)) delete out.instruction![r.label];
  for (const r of otherRates) if (out.other![r.label] === r.rate) delete out.other![r.label];
  for (const o of programs.flatMap(p => p.options)) {
    if (out.assign![o.name] && out.assign![o.name] === defaultAircraftFor(o.lineItems)) delete out.assign![o.name];
    const h = out.hours?.[o.name];
    if (h) { for (const [i, n] of Object.entries(h)) if (Number(LINE.exec(o.lineItems[Number(i)] ?? "")?.[1]) === n) delete h[i]; if (!Object.keys(h).length) delete out.hours![o.name]; }
    const f = o.lineItems.map(l => FEE_LINE.exec(l)).find(Boolean);
    if (out.fee?.[o.name] !== undefined && f && num(f[1]!) === out.fee[o.name]) delete out.fee[o.name];
  }
  for (const r of rentalRates) if (out.names?.[r.aircraft] === r.names) delete out.names[r.aircraft];
  for (const k of ["names", "hours", "fee"] as const) if (out[k] && !Object.keys(out[k]!).length) delete out[k];
  return out;
}
