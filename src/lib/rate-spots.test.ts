import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRates, fleetRate, isCalculatedLine, rateKey, rateValue, withRateDrafts } from "./rates-engine";
import { fleet } from "./site-data";
import { contentOf } from "./content-slots";

const est = (cfg: object, option: string) => applyRates(cfg).programs.flatMap(p => p.options).find(o => o.name === option)!.estimatedCost;

test("fleet card rates come from the rental table and match the published fleet rates", () => {
  const r = applyRates({});
  for (const f of fleet) {
    const live = fleetRate(r, f.registration);
    assert.equal(live?.rate, f.rate, f.registration);
    if (f.rate) assert.equal(live?.prepay, f.prepay, f.registration);
  }
});
test("typing a Cessna 172 prepay of 185 on any page raises Private Pilot to $10,000", () => {
  const cfg = withRateDrafts({}, { [rateKey.rental("Cessna 172", "prepay")]: "185" });
  assert.equal(est(cfg, "Accelerated Private Pilot"), "As low as $10,000");
  assert.equal(rateValue(applyRates(cfg), rateKey.rental("Cessna 172", "regular")), "$185");
  assert.equal(fleetRate(applyRates(cfg), "N8570B")?.prepay, "$185/hr");
});
test("a rate typed back to its published value leaves no saved change", () => {
  assert.deepEqual(withRateDrafts({}, { [rateKey.rental("Cessna 172", "prepay")]: "175", [rateKey.instruction("Primary flight & ground instruction")]: "$60" }),
    { rental: {}, instruction: {}, other: {}, assign: {} });
});
test("something that is not a price is ignored", () => {
  assert.deepEqual(withRateDrafts({}, { [rateKey.rental("Cessna 172", "prepay")]: "abc" }).rental, {});
});
test("pricing a course with a different airplane changes its total", () => {
  const cfg = withRateDrafts({}, { [rateKey.assign("Accelerated Private Pilot")]: "Cessna 150" });
  assert.equal(est(cfg, "Accelerated Private Pilot"), "As low as $7,200");
});
test("an intro flight price edit changes the shared price", () => {
  const cfg = withRateDrafts({}, { [rateKey.other("Introductory flight")]: "$110" });
  assert.equal(rateValue(applyRates(cfg), rateKey.other("Introductory flight")), "$110");
});
test("hour-and-rate cost lines are calculated, other lines are typed", () => {
  assert.equal(isCalculatedLine("40 hours Cessna 172 rental at $175/hr: $7,000"), true);
  assert.equal(isCalculatedLine("FAA medical estimate: $100"), false);
});
test("inline text spots keep saved words, but too-long words fall back to the original", () => {
  const c = contentOf({ "home.hero.title": "FLY FOR A LIVING", "rates.intro.title": "x".repeat(200) });
  assert.equal(c.text("home.hero.title", "BECOME A PROFESSIONAL PILOT"), "FLY FOR A LIVING");
  assert.equal(c.text("rates.intro.title", "Every published rate, in one place."), "Every published rate, in one place.");
  assert.equal(c.text("other.unsaved", "Original"), "Original");
});
