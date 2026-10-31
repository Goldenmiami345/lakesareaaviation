import { z } from "zod";

const str = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  firstName: str(60).min(1, "First name is required"),
  lastName: str(60).min(1, "Last name is required"),
  email: str(255).email("Enter a valid email"),
  phone: str(30).regex(/^\+?[0-9 ()./-]{7,30}$/, "Enter a valid phone number").refine((v) => v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 15, "Enter a valid phone number"),
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
  aircraftNote: str(200),
  sourceUrl: str(500),
  website: z.string().max(200), // honeypot: must stay empty
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Max submissions per IP in a rolling 10-minute window. */
export const LEAD_RATE_LIMIT = 3;
