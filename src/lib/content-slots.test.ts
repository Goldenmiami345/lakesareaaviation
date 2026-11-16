import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanContent, contentOf, SLOTS } from "./content-slots";
import { testimonials } from "./site-data";

test("no saved content gives the original testimonials", () => {
  assert.deepEqual(contentOf({}).testimonials, testimonials.map(t => ({ ...t })));
});
test("a valid edit replaces only its own slot", () => {
  const c = contentOf({ "testimonial.0.name": "Jane Doe" });
  assert.equal(c.testimonials[0]!.name, "Jane Doe");
  assert.equal(c.testimonials[1]!.name, testimonials[1]!.name);
});
test("empty, too-long, unknown and non-https photo values fall back", () => {
  const slot = SLOTS.find(s => s.key === "testimonial.0.quote")!;
  const out = cleanContent({ "testimonial.0.name": "  ", "testimonial.0.quote": "x".repeat(slot.max + 1), "nope": "x", "course.tailwheel.photo": "javascript:alert(1)" });
  assert.deepEqual(out, {});
});
test("an uploaded https photo replaces the course photo", () => {
  assert.equal(contentOf({ "course.tailwheel.photo": "https://cdn.example/x.webp" }).photo("tailwheel")!.src, "https://cdn.example/x.webp");
});
