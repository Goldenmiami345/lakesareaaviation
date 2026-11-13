import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { noteForProgram, plannedForProgram } from "./plan-preselect";
import { specialtyCourses } from "./site-data";

test("CFI course option preselects only the CFI rating", () => {
  assert.deepEqual(plannedForProgram("Certified Flight Instructor"), ["cfi"]);
});
test("CFII course option preselects only the CFII rating", () => {
  assert.deepEqual(plannedForProgram("Certified Flight Instructor–Instrument"), ["cfii"]);
});
test("CFI & CFII program preselects both instructor ratings", () => {
  assert.deepEqual(plannedForProgram("CFI & CFII"), ["cfi", "cfii"]);
});
test("a specialty course selects no rating and prefills a note", () => {
  assert.deepEqual(plannedForProgram("Tailwheel Endorsement"), []);
  assert.equal(noteForProgram("Tailwheel Endorsement"), "I’m interested in Tailwheel Endorsement.");
});
test("an unknown or missing program keeps the planner default", () => {
  assert.equal(plannedForProgram(undefined), null);
  assert.equal(plannedForProgram("Something else"), null);
});
test("every specialty page is prerendered with a contract", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  const contracts = JSON.parse(readFileSync("scripts/prerender-contracts.json", "utf8"));
  for (const c of specialtyCourses) {
    assert.ok(vite.includes(`"${c.slug}"`), `${c.slug} missing from vite pages`);
    assert.equal(contracts[`/specialized-training/${c.slug}`]?.heading, c.name);
  }
});
test("Kodiak 100 keeps the published 3–4 day initial and 1–2 day recurrent timelines", () => {
  const k = specialtyCourses.find((c) => c.slug === "kodiak-100")!;
  assert.deepEqual(k.facts.map((f) => f.v), ["3–4 days", "1–2 days"]);
});
