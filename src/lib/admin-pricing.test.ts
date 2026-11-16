import { test } from "node:test";
import assert from "node:assert/strict";
import { allCourses, cleanCatalog, EMPTY_CATALOG, joinNames, planePriceChange, planesOf, setCoursePricing, withoutName } from "./catalog";
import { aircraftChoicesFor, applyRates, rateKey, withRateDrafts } from "./rates-engine";
import { programs } from "./site-data";

const opt = (r: ReturnType<typeof applyRates>, name: string) => r.programs.flatMap(p => p.options).find(o => o.name === name)!;
const r0 = applyRates({});
const plane = (c: typeof EMPTY_CATALOG, r: ReturnType<typeof applyRates>, reg: string) => planesOf(c, r).find(p => p.registration === reg)!;

test("Private Pilot rental 40 -> 45 hours adds 5 x $175 and updates the hour summary", () => {
  const r = applyRates(withRateDrafts({}, { [rateKey.hours("Accelerated Private Pilot", 0)]: "45" }));
  assert.equal(opt(r, "Accelerated Private Pilot").estimatedCost, "As low as $10,475");
  assert.equal(opt(r, "Accelerated Private Pilot").lineItems[0], "45 hours Cessna 172 rental at $175/hr: $7,875");
  assert.equal(r.programs.find(p => p.slug === "private-pilot")!.details[0], "45 hours Cessna 172 rental");
});
test("CFI course fee $1,000 -> $1,200 raises its estimate by $200", () => {
  const r = applyRates(withRateDrafts({}, { [rateKey.fee("Certified Flight Instructor")]: "1200" }));
  assert.equal(opt(r, "Certified Flight Instructor").estimatedCost, "As low as $5,325");
  assert.equal(opt(r, "Certified Flight Instructor").lineItems[0], "Course fee: $1,200");
});
test("hours or fee set back to the published value leave no saved change", () => {
  assert.deepEqual(withRateDrafts({}, { [rateKey.hours("Accelerated Private Pilot", 0)]: "40", [rateKey.fee("Certified Flight Instructor")]: "1000" }), withRateDrafts({}, {}));
});

test("changing only Phoenix's price gives it its own line; Blue keeps $185", () => {
  const ch = planePriceChange(EMPTY_CATALOG, r0, "N8570B", "Cessna 172", { regular: 200, prepay: 190, scope: "plane" });
  assert.equal(ch.rateRow, "Cessna 172 (N8570B)");
  const r = applyRates(withRateDrafts({}, ch.drafts));
  const c = cleanCatalog({ edits: { N8570B: { rateRow: ch.rateRow } } });
  assert.equal(plane(c, r, "N8570B").rate, "$200/hr");
  assert.equal(plane(c, r, "N8570B").prepay, "$190/hr");
  assert.equal(plane(c, r, "N6717A").rate, "$185/hr");
  assert.equal(r.rentalRates.find(x => x.aircraft === "Cessna 172")!.names, "“Blue” or “Robin”");
  // Courses stay on the shared Cessna 172 line until the owner picks Phoenix's line.
  assert.equal(opt(r, "Accelerated Private Pilot").estimatedCost, "As low as $9,600");
});
test("a course priced with Phoenix's own line follows Phoenix's prepay price", () => {
  const ch = planePriceChange(EMPTY_CATALOG, r0, "N8570B", "Cessna 172", { regular: 200, prepay: 190, scope: "plane" });
  const r = applyRates(withRateDrafts({}, { ...ch.drafts, [rateKey.assign("Accelerated Private Pilot")]: ch.rateRow }));
  assert.equal(opt(r, "Accelerated Private Pilot").estimatedCost, "As low as $10,200"); // 40 h x $15 more
});
test("choosing 'every airplane on this line' changes Blue too", () => {
  const ch = planePriceChange(EMPTY_CATALOG, r0, "N8570B", "Cessna 172", { regular: 200, prepay: 190, scope: "line" });
  assert.equal(ch.rateRow, "Cessna 172");
  assert.equal(plane(EMPTY_CATALOG, applyRates(withRateDrafts({}, ch.drafts)), "N6717A").rate, "$200/hr");
});
test("an airplane alone on its line just changes that line", () => {
  const ch = planePriceChange(EMPTY_CATALOG, r0, "N6641F", "Cessna 150", { regular: 130, prepay: 120, scope: "plane" });
  assert.equal(ch.rateRow, "Cessna 150");
  assert.equal(applyRates(withRateDrafts({}, ch.drafts)).rentalRates.find(x => x.aircraft === "Cessna 150")!.prepay, "$120");
});
test("a twin's own line can price multi-engine courses, never single-engine ones", () => {
  const extra = [{ aircraft: "Piper Apache PA-23-160 (N4383P)", names: "N4383P", regular: 400, prepay: 380, twin: true }];
  const multi = programs.flatMap(p => p.options).find(o => o.name === "Commercial Multi-Engine Land")!;
  const single = programs.flatMap(p => p.options).find(o => o.name === "Accelerated Private Pilot")!;
  assert.ok(aircraftChoicesFor(multi.lineItems, extra).includes(extra[0]!.aircraft));
  assert.ok(!aircraftChoicesFor(single.lineItems, extra).includes(extra[0]!.aircraft));
});
test("rate-line airplane lists drop one name and keep the published style", () => {
  assert.equal(withoutName("“Blue,” “Robin” or “Phoenix”", "Robin"), "“Blue” or “Phoenix”");
  assert.equal(withoutName("“Hawk” or “Cardinal”", "Hawk"), "“Cardinal”");
  assert.equal(joinNames(["A", "B", "C", "D"]), "“A,” “B,” “C” or “D”");
});

test("tailwheel priced at 10 h Taylorcraft + 5 h primary instruction = $1,550, and follows the Taylorcraft rate", () => {
  const c = setCoursePricing(EMPTY_CATALOG, "tailwheel", { fee: 0, blocks: [{ hours: 10, what: "rental", aircraft: "Taylorcraft BC-12D" }, { hours: 5, what: "flight", instruction: "Primary flight & ground instruction" }] });
  assert.equal(allCourses(cleanCatalog(c), r0).find(x => x.slug === "tailwheel")!.price!.estimatedCost, "As low as $1,550");
  const r = applyRates({ rental: { "Taylorcraft BC-12D": { regular: 145, prepay: 135 } } });
  assert.equal(allCourses(cleanCatalog(c), r).find(x => x.slug === "tailwheel")!.price!.estimatedCost, "As low as $1,650");
});
test("a course with no hours and no fee has no price (stays 'In your training plan')", () => {
  const c = setCoursePricing(EMPTY_CATALOG, "complex", { fee: 0, blocks: [{ hours: 0, what: "rental", aircraft: "Cessna 172" }] });
  assert.equal(allCourses(c, r0).find(x => x.slug === "complex")!.price, undefined);
});
