import { expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { fleet, instructionRates, otherRates, RATE_NOTES, RATE_SHEET_URL, rentalRates } from "./site-data";
import { findPlane, planeSlug, planeTitle } from "./fleet-info";

test("Cessna 172 rents for $185 regular and $175 prepay", () => {
  expect(rentalRates[0]).toMatchObject({ aircraft: "Cessna 172", regular: "$185", prepay: "$175" });
});
test("Apache rents for $395 regular and $375 prepay", () => {
  expect(rentalRates.find((r) => r.aircraft.startsWith("Piper Apache"))).toMatchObject({ regular: "$395", prepay: "$375" });
});
test("every fleet airplane with a rate matches the published rate sheet", () => {
  for (const p of fleet.filter((p) => p.rate)) {
    const row = rentalRates.find((r) => p.name.includes(r.aircraft.split(" / ")[0]!.replace(/^Piper /, "")) || r.names.includes(p.nickname ?? "~"));
    expect(row, p.registration).toBeDefined();
    expect(`${row!.regular}/hr`).toBe(p.rate!);
    expect(`${row!.prepay}/hr`).toBe(p.prepay!);
  }
});
test("multi-engine instruction is $75/hr, other instruction $60 or $70", () => {
  expect(instructionRates.find((r) => r.label.startsWith("Multi-engine"))?.rate).toBe("$75");
  expect(instructionRates.find((r) => r.label.startsWith("Primary"))?.rate).toBe("$60");
  expect(instructionRates.find((r) => r.label.includes("non-flight-school"))?.rate).toBe("$70");
});
test("intro flight $100, housing $30/night, cars $20/day, MSP pickup $125", () => {
  const r = Object.fromEntries(otherRates.map((x) => [x.label, x.rate]));
  expect(r["Introductory flight"]).toBe("$100");
  expect(r["Student housing"]).toBe("$30/night");
  expect(r["Student cars (housing residents)"]).toBe("$20/day");
  expect(r["Airport pickup (MSP)"]).toBe("$125");
});
test("prepay applies at a $500 balance", () => expect(RATE_NOTES.prepay).toContain("$500"));
test("the downloadable rate sheet ships with the site", () => {
  expect(existsSync(new URL(`../../public${RATE_SHEET_URL}`, import.meta.url))).toBe(true);
});
test("each airplane has a prerendered page at /fleet/<lowercase tail>", () => {
  const config = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
  const contracts = JSON.parse(readFileSync(new URL("../../scripts/prerender-contracts.json", import.meta.url), "utf8"));
  for (const p of fleet) {
    expect(findPlane(planeSlug(p))).toBe(p);
    expect(config).toContain(`"${planeSlug(p)}"`);
    expect(contracts[`/fleet/${planeSlug(p)}`]).toEqual({ heading: planeTitle(p), copy: p.name });
  }
});
test("unknown tail numbers have no page", () => expect(findPlane("n00000")).toBeUndefined());
