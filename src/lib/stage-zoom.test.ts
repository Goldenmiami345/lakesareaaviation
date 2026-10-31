import { test } from "node:test";
import assert from "node:assert/strict";
import { clampView, zoomAt, IDENTITY, ZOOM_MAX } from "./stage-zoom";

test("zoom is capped at 4x and never below 1x", () => {
  assert.equal(zoomAt(IDENTITY, 10, 100, 100, 390, 844).s, ZOOM_MAX);
  assert.equal(ZOOM_MAX, 4);
  assert.equal(zoomAt(IDENTITY, 0.3, 100, 100, 390, 844).s, 1);
});
test("the point under the fingers stays put", () => {
  const v = zoomAt(IDENTITY, 2.5, 200, 300, 390, 844);
  assert.ok(Math.abs(v.x + 200 * 2.5 - 200) < 1e-9 && Math.abs(v.y + 300 * 2.5 - 300) < 1e-9);
});
test("panning cannot reveal empty edges", () => {
  const v = clampView({ s: 2, x: 500, y: -5000 }, 390, 844);
  assert.equal(v.x, 0); assert.equal(v.y, 844 - 844 * 2);
});
