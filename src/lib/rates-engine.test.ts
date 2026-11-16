import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRates, rateImpact } from "./rates-engine";
import { programs } from "./site-data";

const opt = (r: ReturnType<typeof applyRates>, name: string) => r.programs.flatMap(p => p.options).find(o => o.name === name)!;

test("no overrides reproduces every published price exactly", () => {
  assert.deepEqual(applyRates({}).programs, programs);
});
test("Cessna 172 prepay $175 -> $185 raises Private Pilot by 40 hours x $10", () => {
  const r = applyRates({ rental: { "Cessna 172": { regular: 195, prepay: 185 } } });
  assert.equal(opt(r, "Accelerated Private Pilot").estimatedCost, "As low as $10,000");
  assert.equal(opt(r, "Accelerated Private Pilot").lineItems[0], "40 hours Cessna 172 rental at $185/hr: $7,400");
  assert.equal(r.rentalRates[0]!.regular, "$195");
});
test("Cessna 172 change leaves Apache courses untouched", () => {
  const r = applyRates({ rental: { "Cessna 172": { regular: 195, prepay: 185 } } });
  assert.equal(opt(r, "Commercial Multi-Engine Land").estimatedCost, "As low as $5,300");
});
test("Apache prepay $375 -> $400 raises Multi-Engine by 10 hours x $25", () => {
  const r = applyRates({ rental: { "Piper Apache PA-23-160": { regular: 420, prepay: 400 } } });
  assert.equal(opt(r, "Commercial Multi-Engine Land").estimatedCost, "As low as $5,550");
});
test("multi-engine instruction $75 -> $80 raises MEI by 12 hours x $5", () => {
  const r = applyRates({ instruction: { "Multi-engine flight & ground instruction": 80 } });
  assert.equal(opt(r, "Multi-Engine Flight Instructor").estimatedCost, "As low as $4,535");
});
test("assigning the Cessna 150 to CFI prices its 15 rental hours at $115", () => {
  const r = applyRates({ assign: { "Certified Flight Instructor": "Cessna 150" } });
  assert.equal(opt(r, "Certified Flight Instructor").estimatedCost, "As low as $4,225");
  assert.equal(opt(r, "Certified Flight Instructor").lineItems[2], "15 hours Cessna 150 rental at $115/hr: $1,725");
});
test("malformed overrides are ignored", () => {
  const r = applyRates({ rental: { "Cessna 172": { regular: -5, prepay: "x" } }, assign: { "Certified Flight Instructor": "Boeing 747" } });
  assert.deepEqual(r.programs, programs);
});
test("impact preview lists only changed courses", () => {
  const list = rateImpact(applyRates({}), applyRates({ instruction: { "Instrument flight & ground instruction": 70 } }));
  assert.deepEqual(list.map(x => x.option), ["Accelerated Instrument Rating"]);
  assert.equal(list[0]!.to, "As low as $8,550");
});
import { estimatorPrices } from "./rates-engine";
test("estimator defaults match published course and service prices", () => {
  const e = estimatorPrices(applyRates({}));
  assert.deepEqual(e.cost, { private: 9600, instrument: 8300, "commercial-single": 4625, "commercial-multi": 5300, cfi: 5125, cfii: 3150, mei: 4475 });
  assert.deepEqual([e.housing, e.car, e.pickup], [30, 20, 125]);
});
test("estimator follows a Cessna 172 rate change and a housing change", () => {
  const e = estimatorPrices(applyRates({ rental: { "Cessna 172": { regular: 195, prepay: 185 } }, other: { "Student housing": "$35/night" } }));
  assert.equal(e.cost.private, 10000);
  assert.equal(e.housing, 35);
});
