import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatPhone, leadSchema, normalizePhone } from "./lead-schema";

const base = {
  firstName: "Jane", lastName: "Doe", email: "jane@example.com", phone: "318-347-9004",
  preferredLocation: "Little Falls", targetStartDate: "", notes: "", ratingsHeld: [], ratingsPlanned: ["cfi"],
  housing: true, car: false, airportPickup: false, trainingDays: 7, estimatedTotal: 5335, contingency: 1067, bufferedTotal: 6402, aircraftNote: "", sourceUrl: "", website: "",
};
const phoneOf = (phone: string) => { const r = leadSchema.safeParse({ ...base, phone }); return r.success ? r.data.phone : null; };

describe("leadSchema", () => {
  test("accepts a valid lead", () => assert.equal(leadSchema.safeParse(base).success, true));
  test("rejects a bad email", () => assert.equal(leadSchema.safeParse({ ...base, email: "nope" }).success, false));
  test("rejects a too-short phone", () => assert.equal(leadSchema.safeParse({ ...base, phone: "12345" }).success, false));
  test("rejects notes over 2000 chars", () => assert.equal(leadSchema.safeParse({ ...base, notes: "x".repeat(2001) }).success, false));
});

describe("phone normalization", () => {
  test("plain 10 digits", () => assert.equal(phoneOf("3084556336"), "3084556336"));
  test("iOS autofill direction marks", () => assert.equal(phoneOf("\u202A3084556336\u202C"), "3084556336"));
  test("non-breaking spaces and en dashes", () => assert.equal(phoneOf("308\u00A0455\u2013 6336"), "3084556336"));
  test("(308) 455-6336", () => assert.equal(phoneOf("(308) 455-6336"), "3084556336"));
  test("308.455.6336", () => assert.equal(phoneOf("308.455.6336"), "3084556336"));
  test("+1 308 455 6336", () => assert.equal(phoneOf("+1 308 455 6336"), "+13084556336"));
  test("rejects 9 digits", () => assert.equal(phoneOf("308455633"), null));
  test("rejects 16 digits", () => assert.equal(phoneOf("+1234567890123456"), null));
  test("normalize keeps only leading +", () => assert.equal(normalizePhone("1+2+3"), "123"));
  test("formats US numbers", () => { assert.equal(formatPhone("3084556336"), "(308) 455-6336"); assert.equal(formatPhone("+13084556336"), "(308) 455-6336"); });
});
