import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";

export type TrafficPlaneInfo = { reg: string; type: string; nickname: string };

/** Radar data block: altitude in hundreds of feet MSL, zero-padded (2,123 ft -> "021"). */
export function radarAltitude(msl: number) {
  return String(Math.max(0, Math.round(msl / 100))).padStart(3, "0");
}

/**
 * Selection for traffic airplanes.
 * Mouse: hover shows the card, click opens the airplane in Fleet.
 * Touch/pen: first tap shows the card, second tap on the same airplane opens Fleet.
 * Tapping anywhere else closes the card.
 */
export function useTrafficSelection(active: boolean) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selected;
  const pointerType = useRef<string>("mouse");
  const lastDown = useRef(0);
  const navigate = useNavigate();
  const open = useCallback((reg: string) => {
    setSelected(null);
    void navigate({ to: "/fleet", hash: reg.toLowerCase(), hashScrollIntoView: false });
  }, [navigate]);

  useEffect(() => { if (!active) setSelected(null); }, [active]);
  useEffect(() => {
    if (selected === null) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-traffic-hit],[data-traffic-card]")) return;
      setSelected(null);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [selected]);

  const hitProps = (i: number, reg: string) => ({
    "data-traffic-hit": "",
    onPointerDown: (e: React.PointerEvent) => { pointerType.current = e.pointerType; lastDown.current = performance.now(); },
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setSelected(i); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === "mouse") setSelected((s) => (s === i ? null : s)); },
    onClick: () => {
      if (pointerType.current === "mouse" || selectedRef.current === i) open(reg);
      else setSelected(i);
    },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") open(reg); },
    // Keyboard focus shows the card; a tap's own focus must not count as the first tap.
    onFocus: () => { if (performance.now() - lastDown.current > 600) setSelected(i); },
  });

  return { selected, selectedRef, open, hitProps, close: () => setSelected(null) };
}

/** Position a fixed card next to a screen point, kept inside the viewport. */
export function placeCard(card: HTMLElement | null, x: number, y: number) {
  if (!card) return;
  const w = card.offsetWidth || 208, h = card.offsetHeight || 110;
  const W = window.innerWidth, H = window.innerHeight;
  let px: number, py: number;
  if (x + 26 + w <= W - 8) { px = x + 26; py = y - h / 2; }
  else if (x - 26 - w >= 8) { px = x - 26 - w; py = y - h / 2; }
  else {
    // Narrow screens: stack above (or below) so the card never covers the airplane's tap target.
    px = Math.max(8, Math.min(W - w - 8, x - w / 2));
    py = y - 30 - h >= 72 ? y - 30 - h : y + 30;
  }
  py = Math.max(72, Math.min(H - h - 8, py));
  card.style.transform = `translate3d(${px.toFixed(0)}px, ${py.toFixed(0)}px, 0)`;
}

/** Info card rendered on <body>, above every photo shade. Live values are written into data-k slots. */
export const TrafficCard = forwardRef<HTMLDivElement, { plane: TrafficPlaneInfo; runway: string; onOpen: () => void }>(function TrafficCard({ plane, runway, onOpen }, ref) {
  return createPortal(
    <div ref={ref} data-traffic-card="" className="traffic-card pointer-events-auto fixed left-0 top-0 z-[70] w-52" role="dialog" aria-label={`${plane.reg} details`}>
      <span className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-bold tracking-wider">{plane.reg}</span><span data-k="phase" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--radar)]" /></span>
      <span className="mt-0.5 block text-xs text-background/75">{plane.type}{plane.nickname ? ` · “${plane.nickname}”` : ""}</span>
      <span className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[11px] tabular-nums">
        <span data-k="alt" /><span data-k="kt" className="text-right" />
        <span data-k="agl" className="text-background/60" /><span className="text-right text-background/60">RWY {runway}</span>
      </span>
      <button type="button" onClick={onOpen} className="mt-2 flex min-h-11 w-full items-center text-left text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--radar)]">View in fleet →</button>
    </div>,
    document.body,
  );
});

export function writeCard(card: HTMLElement | null, s: { msl: number; agl: number; knots: number; phase: string }) {
  if (!card) return;
  const set = (k: string, v: string) => { const el = card.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
  set("alt", `${s.msl.toLocaleString("en-US")} ft MSL`);
  set("agl", `${Math.round(s.agl).toLocaleString("en-US")} AGL`);
  set("kt", `${s.knots} kt`);
  set("phase", s.phase);
}

/**
 * Radar-style data tag drawn in screen pixels (the parent applies scale(1/k)).
 * Includes an invisible 44 px tap target and a staggered return-refresh ring.
 */
export function RadarTag({ reg, index, seed, label, tabIndex, hit, tagRef, textRef }: {
  reg: string; index: number; seed: number; label: string; tabIndex: number;
  hit: ReturnType<ReturnType<typeof useTrafficSelection>["hitProps"]>;
  tagRef: (el: SVGGElement | null) => void; textRef: (el: SVGTextElement | null) => void;
}) {
  const period = 5 + ((index + seed) % 3);
  const delay = -((index * 2.3 + seed * 1.1) % period);
  return (
    <g ref={tagRef} className="traffic-tag">
      <circle r={9} className="traffic-ping" style={{ animationDuration: `${period}s`, animationDelay: `${delay}s` }} />
      <line x1={5} y1={-5} x2={15} y2={-15} className="traffic-leader" />
      <rect x={14} y={-27} width={60} height={18} rx={9} className="traffic-pill" />
      <text ref={textRef} x={20} y={-14} className="traffic-label">{reg}</text>
      <circle r={22} fill="transparent" className="cursor-pointer" role="button" tabIndex={tabIndex} aria-label={label} {...hit} />
    </g>
  );
}

type Box = { l: number; t: number; r: number; b: number };
const hits = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
let obstacleCache: { at: number; key: Element | null; list: Box[]; safe: Box } | null = null;
function obstacles(g: SVGGElement) {
  const now = performance.now();
  const section = g.closest("section");
  if (obstacleCache && obstacleCache.key === section && now - obstacleCache.at < 250) return obstacleCache;
  const w = window.innerWidth, h = window.innerHeight;
  const list: Box[] = [];
  const add = (el: Element | null | undefined) => {
    if (!el) return; const r = el.getBoundingClientRect();
    if (r.width && r.height) list.push({ l: r.left - 6, t: r.top - 6, r: r.right + 6, b: r.bottom + 6 });
  };
  add(document.querySelector("header"));
  section?.querySelectorAll(".journey-copy").forEach(add);
  const rail = w < 768 ? 56 : 16;
  obstacleCache = { at: now, key: section, list, safe: { l: 16, t: 16, r: w - rail, b: h - 16 } };
  return obstacleCache;
}

/**
 * Keeps a radar tag readable: inside a 16px safe area, clear of the dot rail, the
 * header and the stage copy. Flips to whichever corner fits and moves the leader with it.
 */
export function layoutTag(g: SVGGElement | null | undefined) {
  if (!g) return;
  const m = g.getScreenCTM();
  const text = g.querySelector<SVGTextElement>(".traffic-label");
  const pill = g.querySelector<SVGRectElement>(".traffic-pill");
  const line = g.querySelector<SVGLineElement>(".traffic-leader");
  if (!m || !text || !pill || !line) return;
  const { list, safe } = obstacles(g);
  const W = Math.ceil(text.getComputedTextLength()) + 14, H = 18;
  const px = m.e, py = m.f;
  let best: { sx: number; sy: number; ox: number; oy: number; score: number } | null = null;
  for (const [sx, sy] of [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]] as const) {
    let ox = sx > 0 ? 14 : sx < 0 ? -14 - W : -W / 2;
    let oy = sy < 0 ? -27 : 9;
    if (sx === 0) oy = sy < 0 ? -34 : 16;
    // clamp horizontally into the safe area
    const cl = Math.min(Math.max(px + ox, safe.l), safe.r - W) - px;
    const shift = Math.abs(cl - ox); ox = cl;
    const box = { l: px + ox, t: py + oy, r: px + ox + W, b: py + oy + H };
    let score = shift;
    if (box.t < safe.t || box.b > safe.b) score += 1000;
    for (const o of list) if (hits(box, o)) score += 500;
    if (!best || score < best.score) best = { sx, sy, ox, oy, score };
    if (score === 0) break;
  }
  if (!best) return;
  const { ox, oy, sy } = best;
  pill.setAttribute("x", ox.toFixed(1)); pill.setAttribute("y", oy.toFixed(1)); pill.setAttribute("width", String(W));
  text.setAttribute("x", (ox + 7).toFixed(1)); text.setAttribute("y", (oy + 12.5).toFixed(1));
  const ax = Math.min(Math.max(0, ox + 4), ox + W - 4) || 0;
  const tx = ax < ox + 2 || ax > ox + W - 2 ? ax : Math.max(ox + 4, Math.min(ox + W - 4, 0));
  const ty = sy < 0 ? oy + H : oy;
  const len = Math.hypot(tx, ty) || 1;
  line.setAttribute("x1", (tx / len * 6).toFixed(1)); line.setAttribute("y1", (ty / len * 6).toFixed(1));
  line.setAttribute("x2", tx.toFixed(1)); line.setAttribute("y2", ty.toFixed(1));
}
