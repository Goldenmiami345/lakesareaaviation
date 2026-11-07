import { test } from "node:test";
import assert from "node:assert/strict";
import { pageReturnActive, returnToPageTop } from "./page-return";

test("Home return suspends section snapping until the smooth glide reaches the hero", () => {
  const classes = new Set(["story-phone", "story-snapping"]);
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let target: ScrollToOptions | undefined;
  const browser = Object.assign(new EventTarget(), {
    scrollY: 1450,
    matchMedia: () => ({ matches: false }),
    scrollTo: (options: ScrollToOptions) => { target = options; },
  });
  const originals = { window: globalThis.window, document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  Object.assign(globalThis, {
    window: browser,
    document: { documentElement: { classList: { contains: (name: string) => classes.has(name), add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) } } },
    requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
  });
  const tick = () => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(0)); };
  try {
    returnToPageTop();
    assert.deepEqual(target, { top: 0, left: 0, behavior: "smooth" });
    assert.equal(pageReturnActive(), true);
    assert.equal(classes.has("story-snapping"), false);
    browser.scrollY = 725; tick();
    assert.equal(pageReturnActive(), true);
    browser.scrollY = 0; tick(); tick(); tick();
    assert.equal(pageReturnActive(), false);
    assert.equal(classes.has("story-snapping"), true);
  } finally { Object.assign(globalThis, originals); }
});