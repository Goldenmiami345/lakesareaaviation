import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");

const rule = (selector: string) => {
  const at = css.indexOf(selector + " {");
  assert.ok(at >= 0, `missing rule: ${selector}`);
  return css.slice(at, css.indexOf("}", at));
};

test("skip link hides with a clipped 1px box, not a transform offset", () => {
  const r = rule(".skip-link");
  // iOS Safari mis-painted a transformed fixed element over page content, so the
  // hidden state must shrink and clip the box instead of sliding it off-screen.
  assert.ok(!/transform\s*:/.test(r), "hidden skip link must not rely on transform");
  for (const p of ["width: 1px", "height: 1px", "overflow: hidden", "clip-path: inset(50%)", "white-space: nowrap"]) {
    assert.ok(r.includes(p), `hidden skip link missing "${p}"`);
  }
});

test("skip link becomes a normal visible button on keyboard focus", () => {
  const r = rule(".skip-link:focus");
  for (const p of ["width: auto", "height: auto", "clip-path: none", "overflow: visible"]) {
    assert.ok(r.includes(p), `focused skip link missing "${p}"`);
  }
  assert.ok(r.includes("outline: 2px solid var(--ring)"), "focused skip link needs a visible outline");
});

test("skip link target exists and the link is the first focusable thing", () => {
  assert.ok(root.includes('<a href="#main" className="skip-link">'), "root must render the skip link");
  assert.ok(root.indexOf('className="skip-link"') < root.indexOf("<Outlet />"), "skip link must come before the page content");
});
