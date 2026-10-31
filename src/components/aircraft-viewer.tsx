import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { fleet } from "../lib/site-data";

type Plane = (typeof fleet)[number];
const MIN = 1, MAX = 4;

/**
 * Full-screen look-around viewer for one airplane, built from its REAL photos.
 * No openly licensed 3D model accurately matches these airplanes and their paint,
 * so we show the real photographs (drag to pan, pinch/scroll to zoom) rather than an
 * invented model. Swap in a turntable or GLB here once walk-around photos exist.
 */
export default function AircraftViewer({ plane, onClose }: { plane: Plane; onClose: () => void }) {
  const views = [{ src: plane.image, label: "Exterior" }, ...(plane.panel ? [{ src: plane.panel, label: "Panel" }] : [])];
  const [view, setView] = useState(0);
  const [touched, setTouched] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const t = useRef({ x: 0, y: 0, z: 1.15 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const touchedRef = useRef(false);

  const apply = () => {
    const el = stage.current, im = img.current;
    if (!el || !im) return;
    const { z } = t.current;
    // Keep the photo covering the frame: limit pan to the zoomed overflow.
    const mx = (el.clientWidth * (z - 1)) / 2, my = (el.clientHeight * (z - 1)) / 2;
    t.current.x = Math.max(-mx, Math.min(mx, t.current.x));
    t.current.y = Math.max(-my, Math.min(my, t.current.y));
    im.style.transform = `translate3d(${t.current.x}px, ${t.current.y}px, 0) scale(${z})`;
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Gentle drift across the photo until the first touch.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      if (touchedRef.current) return;
      const el = stage.current;
      if (el) { t.current.x = Math.sin((now - start) / 4000) * el.clientWidth * 0.06; t.current.y = 0; apply(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      first();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.max(MIN, Math.min(MAX, t.current.z * Math.exp(-dy * 0.0015)));
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2;
      const k = next / t.current.z;
      t.current = { x: px - (px - t.current.x) * k, y: py - (py - t.current.y) * k, z: next };
      apply();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const first = () => { if (!touchedRef.current) { touchedRef.current = true; setTouched(true); } };
  const down = (e: React.PointerEvent) => {
    first();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), z: t.current.z };
    }
  };
  const move = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      t.current.z = Math.max(MIN, Math.min(MAX, (pinch.current.z * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.current.d));
    } else if (pointers.current.size === 1) {
      t.current.x += dx; t.current.y += dy;
    }
    apply();
  };
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null; };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${plane.registration} viewer`} className="fixed inset-0 z-[80] flex flex-col bg-ink text-background">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-background/70"><span className="h-px w-5 bg-primary" />{plane.registration} · “{plane.nickname}”</p>
          <p className="font-display text-lg leading-tight">{plane.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close viewer" autoFocus className="grid size-11 place-items-center rounded-full border border-background/25 hover:bg-primary"><X className="size-5" /></button>
      </div>
      <div ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="relative flex-1 cursor-grab touch-none overflow-hidden bg-ink active:cursor-grabbing">
        <img ref={img} key={view} src={views[view]!.src} alt={`${plane.registration} ${views[view]!.label.toLowerCase()} photo`} draggable={false}
          onLoad={() => { t.current = { x: 0, y: 0, z: 1.15 }; apply(); }}
          className="absolute inset-0 h-full w-full select-none object-contain will-change-transform" />
        <p className={`pointer-events-none absolute inset-x-0 bottom-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-background/80 transition-opacity duration-500 ${touched ? "opacity-0" : "opacity-100"}`}>Drag to look around · pinch to zoom</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex gap-2">
          {views.map((v, i) => (
            <button key={v.label} type="button" aria-pressed={view === i} onClick={() => setView(i)}
              className={`min-h-11 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[0.14em] ${view === i ? "border-primary bg-primary text-primary-foreground" : "border-background/25"}`}>{v.label}</button>
          ))}
        </div>
        <p className="max-w-xs text-[11px] leading-snug text-background/60">Real photos of this airplane. A true-to-paint 3D model isn’t available yet, so we don’t show an invented one.</p>
      </div>
    </div>
  );
}
