import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { leadSchema } from "./lead-schema";

const base = {
  firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "318-347-9004",
  preferredLocation: "Little Falls", targetStartDate: "", notes: "", ratingsHeld: [], ratingsPlanned: ["cfi"],
  housing: true, car: false, airportPickup: false, trainingDays: 7, estimatedTotal: 5335, aircraftNote: "", sourceUrl: "", website: "",
};

describe("leadSchema", () => {
  test("accepts a valid lead", () => assert.equal(leadSchema.safeParse(base).success, true));
  test("rejects a bad email", () => assert.equal(leadSchema.safeParse({ ...base, email: "nope" }).success, false));
  test("rejects a too-short phone", () => assert.equal(leadSchema.safeParse({ ...base, phone: "12345" }).success, false));
  test("rejects notes over 2000 chars", () => assert.equal(leadSchema.safeParse({ ...base, notes: "x".repeat(2001) }).success, false));
});
