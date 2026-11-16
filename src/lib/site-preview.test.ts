import { test } from "node:test";
import assert from "node:assert/strict";
import { contentPages, planePages, ratePages } from "./site-preview";

test("an airplane edit previews its own page, the fleet page and the rate sheet", () => {
  assert.deepEqual(planePages("N8570B").map(p => p.path), ["/fleet/n8570b", "/fleet", "/rates"]);
});

test("a price change previews the rate sheet and every course whose total moves", () => {
  const paths = ratePages([{ slug: "private-pilot", name: "Private Pilot" }]).map(p => p.path);
  assert.ok(paths.includes("/rates") && paths.includes("/programs/private-pilot") && paths.includes("/fleet"));
});

test("a changed course photo previews that course page and the course list", () => {
  const paths = contentPages(["course.spin-training.photo"], { programs: {}, courses: {} }).map(p => p.path);
  assert.deepEqual(paths, ["/specialized-training/spin-training", "/specialized-training"]);
});
