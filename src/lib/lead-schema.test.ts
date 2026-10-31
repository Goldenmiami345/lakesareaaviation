import { describe, expect, it } from "vitest";
import { leadSchema } from "./lead-schema";

const base = {
  firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "318-347-9004",
  preferredLocation: "Little Falls", targetStartDate: "", notes: "", ratingsHeld: [], ratingsPlanned: ["cfi"],
  housing: true, car: false, airportPickup: false, trainingDays: 7, estimatedTotal: 5335, aircraftNote: "", sourceUrl: "", website: "",
};

describe("leadSchema", () => {
  it("accepts a valid lead", () => expect(leadSchema.safeParse(base).success).toBe(true));
  it("rejects a bad email", () => expect(leadSchema.safeParse({ ...base, email: "nope" }).success).toBe(false));
  it("rejects a too-short phone", () => expect(leadSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false));
  it("rejects notes over 2000 chars", () => expect(leadSchema.safeParse({ ...base, notes: "x".repeat(2001) }).success).toBe(false));
});
