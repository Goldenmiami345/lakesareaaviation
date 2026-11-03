import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, SITE_URL } from "./site-url";

test("canonical follows the sitemap form, including /programs/ trailing slash", () => {
  assert.equal(canonicalUrl({ fullPath: "/programs/", staticData: { sitemap: true } }), `${SITE_URL}/programs/`);
  assert.equal(canonicalUrl({ fullPath: "/programs/$slug", params: { slug: "mei" }, staticData: { sitemap: true } }), `${SITE_URL}/programs/mei`);
  assert.equal(canonicalUrl({ fullPath: "/", staticData: { sitemap: true } }), `${SITE_URL}/`);
});

test("hidden routes get no canonical", () => {
  assert.equal(canonicalUrl({ fullPath: "/hero-options", staticData: { sitemap: false } }), null);
  assert.equal(canonicalUrl(undefined), null);
});
