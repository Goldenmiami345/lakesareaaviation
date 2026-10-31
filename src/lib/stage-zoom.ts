import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// In-stage zoom for journey imagery (pure math + a gesture hook). The transform is
// translate(x, y) scale(s) about the top-left of the stage, so overlays inside the
// zoomed element (traffic SVGs) stay aligned with the photo.
export const ZOOM_MAX = 4;
export const DOUBLE_TAP_ZOOM = 2.5;
export type View = { s: number; x: number; y: number };
export const IDENTITY: View = { s: 1, x: 0, y: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Keep the zoomed image covering the stage (no empty edges). */
export function clampView(v: View, w: number, h: number): View {
  const s = clamp(v.s, 1, ZOOM_MAX);
  return { s, x: clamp(v.x, w - w * s, 0), y: clamp(v.y, h - h * s, 0) };
}

/** Zoom to scale `s` keeping stage point (px, py) fixed under the finger/cursor. */
export function zoomAt(v: View, s: number, px: number, py: number, w: number, h: number): View {
  const next = clamp(s, 1, ZOOM_MAX);
  const k = next / v.s;
  return clampView({ s: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, w, h);
}

type Opts = { viewportRef: RefObject<HTMLElement | null>; target: () => HTMLElement | null; resetKey: unknown };

export function useStageZoom({ viewportRef, target, resetKey }: Opts) {
  const view = useRef<View>(IDENTITY);
  const [zoomed, setZoomed] = useState(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  const apply = useCallback((v: View, animate = false) => {
    view.current = v;
    const el = targetRef.current();
    if (el) {
      el.style.transition = animate ? "transform .3s cubic-bezier(.2,.7,.2,1)" : "none";
      el.style.transform = v.s === 1 ? "" : `translate3d(${v.x.toFixed(1)}px, ${v.y.toFixed(1)}px, 0) scale(${v.s.toFixed(4)})`;
    }
    const z = v.s > 1.001;
    document.documentElement.classList.toggle("journey-zoomed", z);
    setZoomed(z);
  }, []);

  const reset = useCallback(() => apply(IDENTITY, true), [apply]);

  // Leaving the stage (paging, jump) always restores it.
  useEffect(() => {
    const prev = targetRef.current();
    return () => { if (prev) { prev.style.transform = ""; prev.style.transition = ""; } view.current = IDENTITY; document.documentElement.classList.remove("journey-zoomed"); setZoomed(false); };
  }, [resetKey]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const size = () => ({ w: vp.clientWidth, h: vp.clientHeight });
    const local = (x: number, y: number) => { const r = vp.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
    let pinch: { d0: number; v0: View; cx: number; cy: number } | null = null;
    let pan: { x: number; y: number; v0: View; moved: boolean } | null = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    const mid = (a: Touch, b: Touch) => local((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;

    const onStart = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-model-gesture]')) return;
      if (e.touches.length >= 2) {
        const a = e.touches[0]!, b = e.touches[1]!;
        const m = mid(a, b), v = view.current;
        // Content point under the fingers, in unzoomed stage pixels.
        pinch = { d0: dist(a, b), v0: v, cx: (m.x - v.x) / v.s, cy: (m.y - v.y) / v.s };
        pan = null;
        if (e.cancelable) e.preventDefault();
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const p = local(t.clientX, t.clientY);
      pan = { x: p.x, y: p.y, v0: view.current, moved: false };
    };
    const onMove = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-model-gesture]')) return;
      const { w, h } = size();
      if (pinch && e.touches.length >= 2) {
        const a = e.touches[0]!, b = e.touches[1]!;
        const m = mid(a, b);
        const s = clamp(pinch.v0.s * (dist(a, b) / pinch.d0), 1, ZOOM_MAX);
        apply(clampView({ s, x: m.x - pinch.cx * s, y: m.y - pinch.cy * s }, w, h));
        if (e.cancelable) e.preventDefault();
        return;
      }
      const t = e.touches[0];
      if (!pan || !t) return;
      const p = local(t.clientX, t.clientY);
      if (Math.hypot(p.x - pan.x, p.y - pan.y) > 6) pan.moved = true;
      if (view.current.s > 1.001) {
        if (e.cancelable) e.preventDefault();
        apply(clampView({ s: pan.v0.s, x: pan.v0.x + p.x - pan.x, y: pan.v0.y + p.y - pan.y }, w, h));
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        if (view.current.s < 1.05) { apply(IDENTITY, true); pan = null; return; }
        // One finger left on the glass keeps panning from where it is.
        const t = e.touches[0];
        if (t) { const p = local(t.clientX, t.clientY); pan = { x: p.x, y: p.y, v0: view.current, moved: true }; }
        else pan = null;
        lastTap.t = 0;
        return;
      }
      if (e.touches.length > 0 || !pan) return;
      const tap = !pan.moved;
      const at = { x: pan.x, y: pan.y };
      pan = null;
      if (!tap) { lastTap.t = 0; return; }
      const target = e.target as Element | null;
      if (target?.closest?.("[data-traffic-hit],[data-traffic-card],a,button")) { lastTap.t = 0; return; }
      const now = performance.now();
      if (now - lastTap.t < 320 && Math.hypot(at.x - lastTap.x, at.y - lastTap.y) < 40) {
        lastTap.t = 0;
        const { w, h } = size();
        apply(view.current.s > 1.001 ? IDENTITY : zoomAt(view.current, DOUBLE_TAP_ZOOM, at.x, at.y, w, h), true);
        if (e.cancelable) e.preventDefault();
      } else lastTap = { t: now, ...at };
    };
    // Desktop: ctrl/⌘-scroll and trackpad pinch (ctrlKey wheel) zoom; a plain wheel still pages.
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-model-gesture]')) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const p = local(e.clientX, e.clientY), { w, h } = size();
      const next = zoomAt(view.current, view.current.s * Math.exp(-dy * 0.01), p.x, p.y, w, h);
      apply(next.s < 1.02 ? IDENTITY : next);
    };
    // Mouse drag pans while zoomed.
    let drag: { x: number; y: number; v0: View } | null = null;
    const onDown = (e: PointerEvent) => { if (e.pointerType === "mouse" && view.current.s > 1.001 && !(e.target as Element).closest("[data-traffic-hit],a,button")) drag = { x: e.clientX, y: e.clientY, v0: view.current }; };
    const onPMove = (e: PointerEvent) => { if (drag) { const { w, h } = size(); apply(clampView({ s: drag.v0.s, x: drag.v0.x + e.clientX - drag.x, y: drag.v0.y + e.clientY - drag.y }, w, h)); } };
    const onUp = () => { drag = null; };
    // iOS Safari: stop its own page-zoom gesture on the stage.
    const noGesture = (e: Event) => e.preventDefault();
    vp.addEventListener("touchstart", onStart, { passive: false });
    vp.addEventListener("touchmove", onMove, { passive: false });
    vp.addEventListener("touchend", onEnd, { passive: false });
    vp.addEventListener("touchcancel", onEnd, { passive: false });
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onPMove);
    window.addEventListener("pointerup", onUp);
    vp.addEventListener("gesturestart", noGesture);
    vp.addEventListener("gesturechange", noGesture);
    return () => {
      vp.removeEventListener("touchstart", onStart);
      vp.removeEventListener("touchmove", onMove);
      vp.removeEventListener("touchend", onEnd);
      vp.removeEventListener("touchcancel", onEnd);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onPMove);
      window.removeEventListener("pointerup", onUp);
      vp.removeEventListener("gesturestart", noGesture);
      vp.removeEventListener("gesturechange", noGesture);
    };
  }, [viewportRef, apply]);

  return { zoomed, reset };
}
