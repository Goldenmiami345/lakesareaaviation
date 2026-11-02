import { useEffect } from "react";

// Lenis smooths mouse-wheel scrolling on computers only, and never inside the homepage
// journeys (their own one-notch-one-stage paging owns those) or 3D model gestures.
const inJourney = () => [...document.querySelectorAll("[data-journey-section]")].some((el) => {
  const r = el.getBoundingClientRect();
  return r.top <= 24 && r.bottom >= window.innerHeight - 1;
});

export function SmoothWheel() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({
        autoRaf: true,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.12,
        prevent: (node: HTMLElement) => inJourney() || !!node.closest?.("[data-model-gesture]"),
      });
      // Reaching a pinned journey ends the smooth glide there, so stage paging starts clean.
      // Inside a pinned journey Lenis steps aside entirely (smoothWheel off = untouched native wheel).
      const sync = () => { lenis.options.smoothWheel = !inJourney(); };
      lenis.on("scroll", () => { if (inJourney() && lenis.isScrolling === "smooth") { lenis.stop(); lenis.start(); } });
      window.addEventListener("wheel", sync, { capture: true, passive: true });
      destroy = () => { window.removeEventListener("wheel", sync, { capture: true }); lenis.destroy(); };
    });
    return () => { cancelled = true; destroy?.(); };
  }, []);
  return null;
}
