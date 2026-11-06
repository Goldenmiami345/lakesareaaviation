import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

/** Keep a leading + and digits only; strips iOS autofill marks (U+202A/U+202C), NBSPs, dashes, dots, parens. */
export function normalizePhone(raw: string): string {
  const s = String(raw ?? "").replace(/[^\d+]/g, "");
  return (s.startsWith("+") ? "+" : "") + s.replace(/\+/g, "");
}

/** Readable display: US 10-digit (or +1) as (308) 455-6336, others as +digits. */
export function formatPhone(normalized: string): string {
  const d = normalized.replace(/\D/g, "");
  const us = d.length === 10 ? d : d.length === 11 && d.startsWith("1") ? d.slice(1) : null;
  if (us) return `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`;
  return normalized.startsWith("+") ? normalized : `+${d}`;
}

/** Contingency buffer applied to training + housing + car. */
export const CONTINGENCY_RATE = 0.2;

/** Each rating's direct prerequisite (the rating a student must hold first). */
export const RATING_PREREQUISITES: Record<string, string> = {
  instrument: "private",
  "commercial-single": "instrument",
  "commercial-multi": "private",
  cfi: "commercial-single",
  cfii: "cfi",
  mei: "commercial-multi",
};

/**
 * Add the full prerequisite chain of every planned rating, ordered before the
 * rating that needs it. Ratings already earned are not re-added. Choosing
 * Commercial therefore always brings Private (and Instrument) along.
 */
export function withPrerequisites(planned: string[], earned: string[]): string[] {
  const out = [...planned];
  const queue = [...planned];
  while (queue.length) {
    const pre = RATING_PREREQUISITES[queue.pop()!];
    if (pre && !out.includes(pre) && !earned.includes(pre)) {
      out.unshift(pre);
      queue.push(pre);
    }
  }
  return out;
}

export const leadSchema = z.object({
  firstName: str(60).min(1, "First name is required"),
  lastName: str(60).min(1, "Last name is required"),
  email: str(255).email("Enter a valid email"),
  phone: z.string().max(60).transform(normalizePhone).refine((v) => { const n = v.replace(/\D/g, "").length; return n >= 10 && n <= 15; }, "Enter a valid phone number"),
  preferredLocation: str(80).min(1, "Choose a location"),
  targetStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  notes: str(2000),
  ratingsHeld: z.array(str(40)).max(10),
  ratingsPlanned: z.array(str(40)).max(10),
  housing: z.boolean(),
  car: z.boolean(),
  airportPickup: z.boolean(),
  trainingDays: z.number().int().min(0).max(1000),
  estimatedTotal: z.number().int().min(0).max(1_000_000),
  contingency: z.number().int().min(0).max(1_000_000),
  bufferedTotal: z.number().int().min(0).max(1_200_000),
  aircraftNote: str(200),
  sourceUrl: str(500),
  website: z.string().max(200), // honeypot: must stay empty
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Max submissions per IP in a rolling 10-minute window. */
export const LEAD_RATE_LIMIT = 3;
