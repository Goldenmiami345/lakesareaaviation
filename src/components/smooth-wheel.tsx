import { useEffect } from "react";

// Lenis smooths mouse-wheel scrolling on computers only, and never inside the homepage
// journeys (their own one-notch-one-stage paging owns those) or 3D model gestures.
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
        prevent: (node: HTMLElement) => !!node.closest?.("[data-journey-section],[data-model-gesture]"),
      });
      // A wheel notch that reaches a journey stops the glide there, so paging starts clean.
      const onWheel = (e: WheelEvent) => {
        if ((e.target as Element | null)?.closest?.("[data-journey-section]")) lenis.stop(), lenis.start();
      };
      window.addEventListener("wheel", onWheel, { capture: true, passive: true });
      destroy = () => { window.removeEventListener("wheel", onWheel, { capture: true }); lenis.destroy(); };
    });
    return () => { cancelled = true; destroy?.(); };
  }, []);
  return null;
}
