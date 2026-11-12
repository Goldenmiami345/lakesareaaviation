import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fleet, instructionRates, otherRates, RATE_NOTES, RATE_SHEET_URL, rentalRates } from "./site-data";
import { findPlane, planeSlug, planeTitle } from "./fleet-info";

test("Cessna 172 rents for $185 regular and $175 prepay", () => {
  const r = rentalRates[0]!;
  assert.deepEqual([r.aircraft, r.regular, r.prepay], ["Cessna 172", "$185", "$175"]);
});
test("Apache rents for $395 regular and $375 prepay", () => {
  const r = rentalRates.find((x) => x.aircraft.startsWith("Piper Apache"));
  assert.deepEqual([r?.regular, r?.prepay], ["$395", "$375"]);
});
test("every fleet airplane with a rate matches the published rate sheet", () => {
  // Which rate-sheet row each airplane bills under (the sheet groups 172s by nickname).
  const row: Record<string, string> = { N8570B: "Cessna 172", N6717A: "Cessna 172", N46201: "Cessna 172I / 172K", N7108G: "Cessna 172I / 172K", N4383P: "Piper Apache PA-23-160", N6641F: "Cessna 150", N96150: "Taylorcraft BC-12D" };
  for (const p of fleet.filter((p) => p.rate)) {
    const r = rentalRates.find((x) => x.aircraft === row[p.registration]);
    assert.ok(r, p.registration);
    assert.equal(`${r!.regular}/hr`, p.rate!);
    assert.equal(`${r!.prepay}/hr`, p.prepay!);
  }
});
test("multi-engine instruction is $75/hr, other instruction $60 or $70", () => {
  assert.equal(instructionRates.find((r) => r.label.startsWith("Multi-engine"))?.rate, "$75");
  assert.equal(instructionRates.find((r) => r.label.startsWith("Primary"))?.rate, "$60");
  assert.equal(instructionRates.find((r) => r.label.includes("non-flight-school"))?.rate, "$70");
});
test("intro flight $100, housing $30/night, cars $20/day, MSP pickup $125", () => {
  const r = Object.fromEntries(otherRates.map((x) => [x.label, x.rate]));
  assert.equal(r["Introductory flight"], "$100");
  assert.equal(r["Student housing"], "$30/night");
  assert.equal(r["Student cars (housing residents)"], "$20/day");
  assert.equal(r["Airport pickup (MSP)"], "$125");
});
test("prepay applies at a $500 balance", () => assert.ok(RATE_NOTES.prepay.includes("$500")));
test("the downloadable rate sheet ships with the site", () => {
  assert.equal(existsSync(new URL(`../../public${RATE_SHEET_URL}`, import.meta.url)), true);
});
test("each airplane has a prerendered page at /fleet/<lowercase tail>", () => {
  const config = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
  const contracts = JSON.parse(readFileSync(new URL("../../scripts/prerender-contracts.json", import.meta.url), "utf8"));
  for (const p of fleet) {
    assert.equal(findPlane(planeSlug(p)), p);
    assert.ok(config.includes(`"${planeSlug(p)}"`));
    assert.deepEqual(contracts[`/fleet/${planeSlug(p)}`], { heading: planeTitle(p), copy: p.name });
  }
});
test("unknown tail numbers have no page", () => assert.equal(findPlane("n00000"), undefined));
