import { test } from "node:test";
import assert from "node:assert/strict";
import { allPlanes, buildProgram, cleanCatalog, coursesOf, EMPTY_CATALOG, planesOf, programsOf, setHidden } from "./catalog";
import { applyRates, rateKey, withRateDrafts } from "./rates-engine";
import { fleet, programs, specialtyCourses } from "./site-data";

const r = applyRates({});
test("nothing saved shows the published fleet, programs and courses", () => {
  assert.equal(planesOf(EMPTY_CATALOG, r).length, fleet.length);
  assert.equal(programsOf(EMPTY_CATALOG, r).length, programs.length);
  assert.equal(coursesOf(EMPTY_CATALOG).length, specialtyCourses.length);
});
test("hiding is restorable: hide then bring back returns the same list", () => {
  const hid = setHidden(EMPTY_CATALOG, "fleet", "N6641F", true);
  assert.equal(planesOf(hid, r).some(p => p.registration === "N6641F"), false);
  assert.equal(allPlanes(hid, r).find(p => p.registration === "N6641F")?.hidden, true);
  assert.deepEqual(planesOf(setHidden(hid, "fleet", "N6641F", false), r).map(p => p.registration), fleet.map(p => p.registration));
});
test("a new plane sharing the Cessna 172 line shows the live Cessna 172 price", () => {
  const c = cleanCatalog({ fleet: [{ registration: "n12345", name: "1975 Cessna 172M", role: "trainer", use: "Primary", note: "", photo: "", specs: {}, rateRow: "Cessna 172" }] });
  assert.equal(planesOf(c, applyRates(withRateDrafts({}, { [rateKey.rental("Cessna 172", "regular")]: "195" }))).at(-1)?.rate, "$195/hr");
});
test("a new plane with its own rate line gets that line's price", () => {
  const cfg = withRateDrafts({}, { [rateKey.newRow("Cessna 172M")]: JSON.stringify({ names: "N12345", regular: 190, prepay: 180 }) });
  const c = cleanCatalog({ fleet: [{ registration: "N12345", name: "1975 Cessna 172M", role: "trainer", use: "", note: "", photo: "", specs: {}, rateRow: "Cessna 172M" }] });
  const p = planesOf(c, applyRates(cfg)).at(-1)!;
  assert.equal(p.rate, "$190/hr"); assert.equal(p.prepay, "$180/hr");
});
test("an added program is priced from the rates: $500 fee + 10 h Cessna 172 + 10 h instruction = $2,850", () => {
  const p = buildProgram({ slug: "glider", name: "Glider", short: "", description: "", timeline: "", fee: 500, blocks: [{ hours: 10, what: "rental", aircraft: "Cessna 172" }, { hours: 10, what: "flight", instruction: "Primary flight & ground instruction" }], requirements: [], notes: [] }, r);
  assert.equal(p.options[0]!.estimatedCost, "As low as $2,850");
});
test("duplicate or malformed additions are dropped", () => {
  const c = cleanCatalog({ fleet: [{ registration: "N8570B", name: "dup" }, { registration: "bad", name: "x" }], courses: [{ slug: "tailwheel", name: "dup" }], programs: [{ slug: "Bad Slug", name: "x" }] });
  assert.deepEqual([c.fleet.length, c.courses.length, c.programs.length], [0, 0, 0]);
});
