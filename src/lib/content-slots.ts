// Editable content slots: fixed, named spots whose words or photo the owner may change in admin.
// Everything else (layout, fonts, colors, motion) stays in code. Text limits are sized from the
// original wording so a replacement can never push a layout out of shape.
import { fleet, programs, specialtyCourses, testimonials } from "./site-data";
import { SPECIALTY_PHOTOS } from "./specialty-photos";

export type Slot = { key: string; group: string; label: string; kind: "text" | "photo"; def: string; max: number; multiline?: boolean };
/** Longest replacement a spot accepts: short labels get a little room, sentences more, so a
 *  rewrite never pushes the layout out of shape. */
export const slotLimit = (s: string) => s.length <= 40 ? s.length + Math.max(10, Math.ceil(s.length * 0.6)) : Math.max(Math.ceil(s.length * 1.4), s.length + 30);
const limit = slotLimit;
const text = (key: string, group: string, label: string, def: string, multiline = false): Slot => ({ key, group, label, kind: "text", def, max: limit(def), multiline });

export const SLOTS: Slot[] = [
  ...specialtyCourses.flatMap(c => [
    text(`course.${c.slug}.summary`, "Specialized training", `${c.name}: card summary`, c.summary, true),
    text(`course.${c.slug}.definition`, "Specialized training", `${c.name}: page intro`, c.definition, true),
    { key: `course.${c.slug}.photo`, group: "Specialized training", label: `${c.name}: photo${SPECIALTY_PHOTOS[c.slug]?.standIn ? " (stand-in, needs a real one)" : ""}`, kind: "photo" as const, def: SPECIALTY_PHOTOS[c.slug]?.src ?? "", max: 2000 },
  ]),
  ...programs.map(p => text(`program.${p.slug}.description`, "Programs", `${p.name}: description`, p.description, true)),
  ...testimonials.flatMap((t, i) => [
    text(`testimonial.${i}.quote`, "Testimonials", `Quote ${i + 1}`, t.quote, true),
    text(`testimonial.${i}.name`, "Testimonials", `Quote ${i + 1}: name`, t.name),
    text(`testimonial.${i}.detail`, "Testimonials", `Quote ${i + 1}: detail`, t.detail),
  ]),
  ...fleet.map(f => text(`fleet.${f.registration}.note`, "Fleet", `${f.registration}${f.nickname ? ` “${f.nickname}”` : ""}: note`, f.note, true)),
];
export const SLOT_BY_KEY = new Map(SLOTS.map(s => [s.key, s]));
const BY_KEY = SLOT_BY_KEY;

/** Inline text spots (SlotText with its own default) are named in the page code, not listed here;
 *  their keys follow this shape and their length is checked against the default where they render. */
export const INLINE_KEY = /^[a-z][a-z0-9-]*(\.[A-Za-z0-9_-]+)+$/;
const INLINE_MAX = 2000;

/** Keep only valid values for known slots; anything else falls back to the original. */
export function cleanContent(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const s = BY_KEY.get(k);
    if (!s) { const t = v.trim(); if (t && t.length <= INLINE_MAX && k.length <= 160 && INLINE_KEY.test(k) && !/\.photo$/.test(k)) out[k] = t; continue; }
    const t = v.trim(); if (!t || t.length > s.max || t === s.def) continue;
    if (s.kind === "photo" && !/^https:\/\//.test(t)) continue;
    out[k] = t;
  }
  return out;
}

export function contentOf(raw: unknown) {
  const c = cleanContent(raw);
  const get = (key: string) => c[key] ?? BY_KEY.get(key)?.def ?? "";
  /** Saved words for an inline spot, or its default when nothing (or something too long) is saved. */
  const text = (key: string, def: string) => { const v = c[key]; return v !== undefined && v.length <= slotLimit(def) ? v : def; };
  return {
    values: c,
    get,
    text,
    testimonials: testimonials.map((t, i) => ({ quote: get(`testimonial.${i}.quote`), name: get(`testimonial.${i}.name`), detail: get(`testimonial.${i}.detail`) })),
    photo: (slug: string) => { const p = SPECIALTY_PHOTOS[slug]; const o = c[`course.${slug}.photo`]; return o ? { src: o, alt: p?.alt ?? "", standIn: false } : p; },
  };
}
export type SiteContent = ReturnType<typeof contentOf>;
