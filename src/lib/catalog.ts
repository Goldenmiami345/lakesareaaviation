// Fleet and course catalog: the published airplanes, training programs and specialty courses
// (site-data.ts) plus what the owner added, minus what the owner hid (site_catalog.catalog).
// Hiding never deletes, so anything hidden comes back in one click.
import { fleet as baseFleet, programs as basePrograms, specialtyCourses as baseCourses, type FleetRole, type Program, type SpecialtyCourse, type SpecialtyKind } from "./site-data";
import { FLEET_RATE_ROW, fleetRate, numOf, usdOf, type AppliedRates } from "./rates-engine";

export type Plane = (typeof baseFleet)[number] & { rateRow?: string | undefined; added?: boolean; photos?: string[]; edited?: boolean };
/** Owner changes to any airplane (published or added). Only fields that differ are kept;
 *  "" for nickname/panel/rateRow means "none". Specs are ordered pairs (saved JSON loses key order). */
export type PlaneEdit = { name?: string; nickname?: string; role?: FleetRole; use?: string; note?: string; image?: string; panel?: string; photos?: string[]; specs?: [string, string][]; rateRow?: string };
export type AddedPlane = { registration: string; name: string; nickname?: string; role: FleetRole; use: string; note: string; photo: string; rateRow?: string; specs: Record<string, string> };
export type ProgramBlock = { hours: number; what: "rental"; aircraft: string } | { hours: number; what: "flight" | "ground"; instruction: string };
export type AddedProgram = { slug: string; name: string; short: string; description: string; timeline: string; fee: number; blocks: ProgramBlock[]; requirements: string[]; notes: string[] };
export type AddedCourse = { slug: string; name: string; kind: SpecialtyKind; summary: string; definition: string; train: string[]; location?: string; photo?: string };
export type CatalogKind = "fleet" | "programs" | "courses";
export type Catalog = { hidden: Record<CatalogKind, string[]>; fleet: AddedPlane[]; programs: AddedProgram[]; courses: AddedCourse[]; edits?: Record<string, PlaneEdit> };
export const EMPTY_CATALOG: Catalog = { hidden: { fleet: [], programs: [], courses: [] }, fleet: [], programs: [], courses: [] };
export const PLANE_LIMITS = { name: 60, nickname: 30, use: 80, note: 400, specs: 16, specKey: 30, specValue: 80, photos: 12 } as const;

const ROLES: FleetRole[] = ["trainer", "twin", "tailwheel"];
const KINDS: SpecialtyKind[] = ["endorsement", "course", "kodiak"];
export const REG = /^N[0-9][0-9A-Z]{0,4}$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const lines = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map(x => str(x, max)).filter(Boolean).slice(0, n) : []);
const https = (v: unknown) => { const s = str(v, 2000); return /^https:\/\//.test(s) ? s : ""; };
const hours = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 500 ? Math.round(v * 10) / 10 : 0);

/** Keep only well-formed entries; anything malformed is dropped so a bad save can never break a page. */
export function cleanCatalog(raw: unknown): Catalog {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<Catalog>;
  const regs = new Set(baseFleet.map(f => f.registration));
  const progSlugs = new Set(basePrograms.map(p => p.slug));
  const courseSlugs = new Set(baseCourses.map(x => x.slug));
  const fleet: AddedPlane[] = [];
  for (const f of Array.isArray(c.fleet) ? c.fleet : []) {
    const registration = str(f?.registration, 8).toUpperCase();
    if (!REG.test(registration) || regs.has(registration)) continue; regs.add(registration);
    const name = str(f.name, 60); if (!name) continue;
    const specs: Record<string, string> = {};
    for (const [k, v] of Object.entries(f.specs && typeof f.specs === "object" ? f.specs : {}).slice(0, 10)) { const kk = str(k, 30), vv = str(v, 80); if (kk && vv) specs[kk] = vv; }
    const nickname = str(f.nickname, 30); const rateRow = str(f.rateRow, 60);
    fleet.push({ registration, name, ...(nickname ? { nickname } : {}), role: ROLES.includes(f.role) ? f.role : "trainer", use: str(f.use, 80) || "Flight training", note: str(f.note, 400), photo: https(f.photo), ...(rateRow ? { rateRow } : {}), specs });
  }
  const programs: AddedProgram[] = [];
  for (const p of Array.isArray(c.programs) ? c.programs : []) {
    const slug = str(p?.slug, 60); const name = str(p?.name, 60);
    if (!SLUG.test(slug) || progSlugs.has(slug) || !name) continue; progSlugs.add(slug);
    const blocks: ProgramBlock[] = [];
    for (const b of Array.isArray(p.blocks) ? p.blocks.slice(0, 12) : []) {
      const h = hours(b?.hours); if (!h) continue;
      if (b.what === "rental") { const a = str(b.aircraft, 60); if (a) blocks.push({ hours: h, what: "rental", aircraft: a }); }
      else if (b.what === "flight" || b.what === "ground") { const i = str(b.instruction, 80); if (i) blocks.push({ hours: h, what: b.what, instruction: i }); }
    }
    const fee = typeof p.fee === "number" && Number.isFinite(p.fee) && p.fee >= 0 && p.fee <= 100000 ? Math.round(p.fee) : 0;
    programs.push({ slug, name, short: str(p.short, 40) || name, description: str(p.description, 400), timeline: str(p.timeline, 40) || "Custom", fee, blocks, requirements: lines(p.requirements, 8, 200), notes: lines(p.notes, 8, 300) });
  }
  const courses: AddedCourse[] = [];
  for (const x of Array.isArray(c.courses) ? c.courses : []) {
    const slug = str(x?.slug, 60); const name = str(x?.name, 60);
    if (!SLUG.test(slug) || courseSlugs.has(slug) || !name) continue; courseSlugs.add(slug);
    const location = str(x.location, 40); const photo = https(x.photo);
    courses.push({ slug, name, kind: KINDS.includes(x.kind) ? x.kind : "course", summary: str(x.summary, 160), definition: str(x.definition, 600), train: lines(x.train, 8, 120), ...(location ? { location } : {}), ...(photo ? { photo } : {}) });
  }
  const edits: Record<string, PlaneEdit> = {};
  for (const [reg, e] of Object.entries(c.edits && typeof c.edits === "object" ? c.edits : {})) {
    if (!regs.has(reg) || !e || typeof e !== "object") continue;
    const out = cleanEdit(e);
    if (Object.keys(out).length) edits[reg] = out;
  }
  const hiddenOf = (k: CatalogKind) => { const v = (c.hidden as Record<string, unknown> | undefined)?.[k]; return Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string" && s.length <= 60))] : []; };
  return { hidden: { fleet: hiddenOf("fleet"), programs: hiddenOf("programs"), courses: hiddenOf("courses") }, fleet, programs, courses, ...(Object.keys(edits).length ? { edits } : {}) };
}

function cleanEdit(e: Partial<Record<keyof PlaneEdit, unknown>>): PlaneEdit {
  const L = PLANE_LIMITS; const out: PlaneEdit = {};
  const has = (k: keyof PlaneEdit) => e[k] !== undefined;
  if (has("name")) { const v = str(e.name, L.name); if (v) out.name = v; }
  if (has("nickname") && typeof e.nickname === "string") out.nickname = str(e.nickname, L.nickname);
  if (has("role") && ROLES.includes(e.role as FleetRole)) out.role = e.role as FleetRole;
  if (has("use")) { const v = str(e.use, L.use); if (v) out.use = v; }
  if (has("note") && typeof e.note === "string") out.note = str(e.note, L.note);
  if (has("image")) { const v = https(e.image); if (v) out.image = v; }
  if (has("panel") && typeof e.panel === "string") { const v = e.panel.trim(); if (v === "" || https(v)) out.panel = https(v); }
  if (Array.isArray(e.photos)) out.photos = e.photos.map(https).filter(Boolean).slice(0, L.photos);
  if (Array.isArray(e.specs)) {
    const seen = new Set<string>(); const specs: [string, string][] = [];
    for (const pair of e.specs) {
      if (!Array.isArray(pair)) continue;
      const k = str(pair[0], L.specKey), v = str(pair[1], L.specValue);
      if (k && v && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); specs.push([k, v]); }
      if (specs.length >= L.specs) break;
    }
    out.specs = specs;
  }
  if (has("rateRow") && typeof e.rateRow === "string") out.rateRow = str(e.rateRow, 60);
  return out;
}

/** The editable fields of one airplane, as currently shown. */
export type PlaneFields = { name: string; nickname: string; role: FleetRole; use: string; note: string; image: string; panel: string; photos: string[]; specs: [string, string][]; rateRow: string };
export const fieldsOf = (p: Plane): PlaneFields => ({ name: p.name, nickname: p.nickname ?? "", role: p.role, use: p.use, note: p.note, image: p.image, panel: p.panel ?? "", photos: p.photos ?? [], specs: Object.entries(p.specs ?? {}), rateRow: p.rateRow ?? "" });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Change some details of one airplane. Anything set back to the original is dropped, so
 *  "Undo" on every field leaves no edit at all. */
export function editPlane(c: Catalog, reg: string, patch: Partial<PlaneFields>): Catalog {
  const original = allPlanes({ ...c, edits: {} }).find(p => p.registration === reg);
  if (!original) return c;
  const base = fieldsOf(original);
  const merged = { ...c.edits?.[reg], ...patch } as Record<string, unknown>;
  const kept: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && !same(v, base[k as keyof PlaneFields])) kept[k] = v;
  const edits = { ...c.edits };
  const clean = cleanEdit(kept as PlaneEdit);
  if (Object.keys(clean).length) edits[reg] = clean; else delete edits[reg];
  const { edits: _old, ...rest } = c;
  return Object.keys(edits).length ? { ...rest, edits } : rest;
}
/** Put one airplane back exactly as originally published (or added). */
export const resetPlane = (c: Catalog, reg: string): Catalog => {
  const edits = { ...c.edits }; delete edits[reg];
  const { edits: _old, ...rest } = c;
  return Object.keys(edits).length ? { ...rest, edits } : rest;
};

function withEdit(f: Plane, e: PlaneEdit | undefined): Plane {
  if (!e) return f;
  const out: Plane = { ...f, edited: true };
  if (e.name) out.name = e.name;
  if (e.nickname !== undefined) { if (e.nickname) out.nickname = e.nickname; else delete out.nickname; }
  if (e.role) out.role = e.role;
  if (e.use) out.use = e.use;
  if (e.note !== undefined) out.note = e.note;
  if (e.image) out.image = e.image;
  if (e.panel !== undefined) { if (e.panel) out.panel = e.panel; else delete out.panel; }
  if (e.photos) out.photos = e.photos;
  if (e.specs) out.specs = Object.fromEntries(e.specs);
  if (e.rateRow !== undefined) { if (e.rateRow) out.rateRow = e.rateRow; else delete out.rateRow; }
  return out;
}

/** Every airplane (published then added), with `hidden` marking the ones taken off the site. */
export function allPlanes(c: Catalog, r?: AppliedRates): (Plane & { hidden: boolean })[] {
  const added: Plane[] = c.fleet.map(f => ({ name: f.name, registration: f.registration, role: f.role, ...(f.nickname ? { nickname: f.nickname } : {}), use: f.use, note: f.note, image: f.photo, position: "center", specs: f.specs, ...(f.rateRow ? { rateRow: f.rateRow } : {}), added: true }));
  return [...baseFleet.map((f): Plane => ({ ...f, rateRow: FLEET_RATE_ROW[f.registration] })), ...added].map(f0 => {
    const f = withEdit(f0, c.edits?.[f0.registration]);
    const out: Plane & { hidden: boolean } = { ...f, hidden: c.hidden.fleet.includes(f.registration) };
    // Prices always come from the live rental table, so a rate change shows on every fleet card.
    if (r) {
      const live = f.rateRow ? fleetRate(r, f.registration, f.rateRow) : undefined;
      delete out.rate; delete out.prepay;
      if (live) { out.rate = live.rate; out.prepay = live.prepay; }
    }
    return out;
  });
}
export const planesOf = (c: Catalog, r?: AppliedRates) => allPlanes(c, r).filter(f => !f.hidden);

/** An added program priced from the live rates, in the same shape and line format as a published one. */
export function buildProgram(p: AddedProgram, r: AppliedRates): Program {
  let total = p.fee;
  const items: string[] = p.fee ? [`Course fee: ${usdOf(p.fee)}`] : [];
  const details: string[] = [];
  for (const b of p.blocks) {
    const what = b.what === "rental" ? `${b.aircraft} rental` : `${b.what === "flight" ? "flight" : "ground"} instruction`;
    const rate = b.what === "rental" ? numOf(r.rentalRates.find(x => x.aircraft === b.aircraft)?.prepay ?? "0") : numOf(r.instructionRates.find(x => x.label === b.instruction)?.rate ?? "0");
    total += b.hours * rate;
    items.push(`${b.hours} hours ${what} at $${rate}/hr: ${usdOf(b.hours * rate)}`);
    details.push(`${b.hours} hours ${what}`);
  }
  return { slug: p.slug, name: p.name, short: p.short, description: p.description, details, notes: p.notes,
    options: [{ name: p.name, timeline: p.timeline, estimatedCost: `As low as ${usdOf(total)}`, lineItems: items, requirements: p.requirements }] };
}
export function allPrograms(c: Catalog, r: AppliedRates): (Program & { hidden: boolean; added?: boolean })[] {
  return [...r.programs, ...c.programs.map(p => ({ ...buildProgram(p, r), added: true }))].map(p => ({ ...p, hidden: c.hidden.programs.includes(p.slug) }));
}
export const programsOf = (c: Catalog, r: AppliedRates) => allPrograms(c, r).filter(p => !p.hidden);

export function allCourses(c: Catalog): (SpecialtyCourse & { hidden: boolean; photo?: string; added?: boolean })[] {
  return [...baseCourses, ...c.courses.map(x => ({ slug: x.slug, name: x.name, kind: x.kind, summary: x.summary, definition: x.definition, train: x.train, facts: [], ...(x.location ? { location: x.location } : {}), ...(x.photo ? { photo: x.photo } : {}), added: true }))]
    .map(x => ({ ...x, hidden: c.hidden.courses.includes(x.slug) }));
}
export const coursesOf = (c: Catalog) => allCourses(c).filter(x => !x.hidden);

/** Hide or bring back one item. */
export function setHidden(c: Catalog, kind: CatalogKind, id: string, hidden: boolean): Catalog {
  const list = c.hidden[kind].filter(x => x !== id);
  return { ...c, hidden: { ...c.hidden, [kind]: hidden ? [...list, id] : list } };
}
