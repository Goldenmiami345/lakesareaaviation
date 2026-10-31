import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";

import c6717a from "../assets/traffic-card/n6717a.webp";
import c8570b from "../assets/traffic-card/n8570b.webp";
import c6641f from "../assets/traffic-card/n6641f.webp";
import c7108g from "../assets/traffic-card/n7108g.webp";
import c3353p from "../assets/traffic-card/n3353p.webp";
import c11059 from "../assets/traffic-card/n11059.webp";

export type TrafficPlaneInfo = { reg: string; type: string; nickname: string };

/** Background-removed cut-outs of each airplane's real fleet photo (480 px WebP with alpha). */
export const CARD_PHOTOS: Record<string, string> = { N6717A: c6717a, N8570B: c8570b, N6641F: c6641f, N7108G: c7108g, N3353P: c3353p, N11059: c11059 };

/** Warm the cache for a stage's airplanes as soon as it becomes active, so the card photo is instant. */
export function usePreloadCardPhotos(regs: readonly string[], active: boolean) {
  const key = regs.join(",");
  useEffect(() => {
    if (!active) return;
    key.split(",").forEach((r) => { const src = CARD_PHOTOS[r]; if (src) { const im = new Image(); im.decoding = "async"; im.src = src; } });
  }, [active, key]);
}

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

/** Position a fixed card next to a screen point: inside a 16px safe area, clear of the
 * side-dot rail, header and stage copy, and never over the tapped airplane. */
const LIFT = 22; // the photo rises this far above the card's top edge
export function placeCard(card: HTMLElement | null, x: number, y: number) {
  if (!card) return;
  const w = card.offsetWidth || 220, h = card.offsetHeight || 150;
  const W = window.innerWidth, H = window.innerHeight;
  const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 64;
  const section = document.elementFromPoint(Math.min(W - 1, Math.max(0, x)), Math.min(H - 1, Math.max(0, y)))?.closest("section");
  const copy = section?.querySelector(".journey-copy");
  const copyTop = copy && getComputedStyle(copy.closest(".journey-copy-wrap") ?? copy).opacity !== "0" ? copy.getBoundingClientRect().top : H;
  const L = 16, R = W - (W < 768 ? 56 : 16), T = header + 8 + LIFT, B = Math.min(H - 16, copyTop - 8);
  let px: number, py: number;
  if (x + 26 + w <= R) { px = x + 26; py = y - h / 2; }
  else if (x - 26 - w >= L) { px = x - 26 - w; py = y - h / 2; }
  else {
    // Narrow screens: stack above (or below) so the card never covers the airplane's tap target.
    px = Math.max(L, Math.min(R - w, x - w / 2));
    py = y - 30 - h >= T ? y - 30 - h : y + 30 + LIFT;
  }
  py = Math.max(T, Math.min(B - h, py));
  // Keep clear of the top-left HUD (address + wind readout).
  const hudEl = section?.querySelector(".journey-hud");
  const hud = hudEl?.getBoundingClientRect();
  if (hud && hud.width && hud.height) {
    const hb = { l: hud.left - 8, t: hud.top - 8 - LIFT, r: hud.right + 8, b: hud.bottom + 8 };
    if (px < hb.r && px + w > hb.l && py < hb.b && py + h > hb.t) {
      const below = hb.b + LIFT;
      const coversPlane = (ty: number, tx: number) => x > tx - 4 && x < tx + w + 4 && y > ty - LIFT - 4 && y < ty + h + 4;
      if (below + h <= B && !coversPlane(below, px)) py = below;
      else if (hb.r + w <= R && !coversPlane(py, hb.r)) px = hb.r;
      else if (below + h <= B) py = below;
      else px = Math.min(R - w, hb.r);
    }
  }
  card.style.transform = `translate3d(${px.toFixed(0)}px, ${py.toFixed(0)}px, 0)`;
}

/** Info card rendered on <body>, above every photo shade. Live values are written into data-k slots. */
export const TrafficCard = forwardRef<HTMLDivElement, { plane: TrafficPlaneInfo; runway: string; onOpen: () => void }>(function TrafficCard({ plane, runway, onOpen }, ref) {
  const photo = CARD_PHOTOS[plane.reg];
  return createPortal(
    <div ref={ref} data-traffic-card="" className="traffic-card pointer-events-auto fixed left-0 top-0 z-[70] w-[min(60vw,15rem)]" role="dialog" aria-label={`${plane.reg} details`}>
      <div className="flex items-start gap-2.5">
        {/* Media slot: fixed 40% width and aspect, so a future 3D model or 360° spin drops in without changing the layout. */}
        <div data-card-media="" className="traffic-card-media relative -mt-[24px] aspect-[480/210] w-[45%] shrink-0">
          {photo && <img src={photo} alt={`${plane.reg}, the real airplane`} width={480} height={210} decoding="async" className="absolute inset-0 h-full w-full object-contain object-bottom" />}
        </div>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-sm font-bold tracking-wider">{plane.reg}</span>
          {plane.nickname && <span className="block truncate text-xs leading-tight text-background">“{plane.nickname}”</span>}
          <span className="block truncate text-[11px] leading-tight text-background/65">{plane.type}</span>
        </span>
      </div>
      <span className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
        <span data-k="alt" /><span data-k="kt" /><span data-k="phase" className="truncate font-bold uppercase tracking-[0.08em] text-[color:var(--radar)]" />
      </span>
      <span className="sr-only">Runway {runway}</span>
      <button type="button" onClick={onOpen} className="mt-1 flex min-h-11 w-full items-center text-left text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--radar)]">View in fleet →</button>
    </div>,
    document.body,
  );
});

export function writeCard(card: HTMLElement | null, s: { msl: number; agl: number; knots: number; phase: string }) {
  if (!card) return;
  const set = (k: string, v: string) => { const el = card.querySelector(`[data-k="${k}"]`); if (el && el.textContent !== v) el.textContent = v; };
  set("alt", `${s.msl.toLocaleString("en-US")} ft`);
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
  section?.querySelectorAll(".journey-copy, .journey-hud").forEach(add);
  const rail = w < 768 ? 56 : 16;
  obstacleCache = { at: now, key: section, list, safe: { l: 16, t: 16, r: w - rail, b: h - 16 } };
  return obstacleCache;
}

type TagSide = { ox: number; oy: number; sy: number; W: number };
const SIDES = [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [1, -2], [-1, -2], [1, 2], [-1, 2]] as const;
const sideOf = (g: SVGGElement) => (g as SVGGElement & { __side?: TagSide }).__side;
const fits = (side: TagSide, pts: { x: number; y: number }[], list: Box[], safe: Box) => pts.every(({ x, y }) => {
  const box = { l: x + side.ox, t: y + side.oy, r: x + side.ox + side.W, b: y + side.oy + 18 };
  if (box.l < safe.l || box.r > safe.r || box.t < safe.t || box.b > safe.b) return false;
  return !list.some((o) => hits(box, o));
});

/**
 * Picks a radar tag's side ONCE for a whole display window: `pts` are the airplane's
 * screen positions across that window (look-ahead). The first side that stays inside
 * the safe area (16px edges, dot rail, header, stage copy) at every point wins and is
 * then fixed: same offset, same leader length every frame. Returns false when no side
 * fits the whole window, so the caller can skip that callout.
 */
export function fitTagSide(g: SVGGElement | null | undefined, pts: { x: number; y: number }[]) {
  if (!g) return false;
  const text = g.querySelector<SVGTextElement>(".traffic-label");
  const pill = g.querySelector<SVGRectElement>(".traffic-pill");
  const line = g.querySelector<SVGLineElement>(".traffic-leader");
  if (!text || !pill || !line) return false;
  obstacleCache = null;
  const { list, safe } = obstacles(g);
  const W = Math.ceil(text.getComputedTextLength()) + 14, H = 18;
  for (const [sx, sy] of SIDES) {
    const ox = sx > 0 ? 14 : sx < 0 ? -14 - W : -Math.round(W / 2);
    let oy = sy < 0 ? -27 : 9;
    if (sx === 0) oy = sy < 0 ? -34 : 16;
    if (Math.abs(sy) === 2) oy = sy < 0 ? -48 : 30;
    const side = { ox, oy, sy, W };
    if (!fits(side, pts, list, safe)) continue;
    (g as SVGGElement & { __side?: TagSide }).__side = side;
    pill.setAttribute("x", String(ox)); pill.setAttribute("y", String(oy)); pill.setAttribute("width", String(W));
    text.setAttribute("x", String(ox + 7)); text.setAttribute("y", String(oy + 12.5));
    const tx = Math.min(Math.max(0, ox), ox + W);
    const ty = Math.min(Math.max(0, oy), oy + H) || (sy < 0 ? oy + H : oy);
    const len = Math.hypot(tx, ty) || 1;
    line.setAttribute("x1", (tx / len * 6).toFixed(1)); line.setAttribute("y1", (ty / len * 6).toFixed(1));
    line.setAttribute("x2", String(tx)); line.setAttribute("y2", String(ty));
    return true;
  }
  return false;
}

/** True while the tag's fixed side still fits the given upcoming screen positions. */
export function tagSideHolds(g: SVGGElement | null | undefined, pts: { x: number; y: number }[]) {
  const side = g && sideOf(g);
  if (!g || !side) return false;
  const { list, safe } = obstacles(g);
  return fits(side, pts, list, safe);
}

/** Places the tag group on its airplane, snapped to whole screen pixels (no sub-pixel shimmer). */
export function setTagPosition(g: SVGGElement | null | undefined, m: DOMMatrix | null | undefined, x: number, y: number) {
  if (!g) return;
  const k = m ? Math.hypot(m.a, m.b) || 1 : 1;
  let ux = x, uy = y;
  if (m && m.a) { ux = (Math.round(m.a * x + m.e) - m.e) / m.a; uy = (Math.round(m.d * y + m.f) - m.f) / m.d; }
  g.setAttribute("transform", `translate(${ux.toFixed(3)} ${uy.toFixed(3)}) scale(${(1 / k).toFixed(4)})`);
}
