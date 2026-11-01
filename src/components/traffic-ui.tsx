import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Button } from './ui/button';
import { AircraftMedia } from './aircraft-media';

import { fleet } from '../lib/site-data';

export type TrafficPlaneInfo = { reg: string; type: string; nickname?: string };
/** Fleet and traffic always share the exact same alpha cutout. */
export const CARD_PHOTOS: Record<string, string> = Object.fromEntries(fleet.map(p => [p.registration, p.image]));

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
const cardPositions = new WeakMap<HTMLElement, {x:number;y:number}>();
export function placeCard(card: HTMLElement | null, x: number, y: number, activeSection?: HTMLElement | null) {
  if (!card) return;
  const w = card.offsetWidth || 220, h = card.offsetHeight || 150;
  const W = window.innerWidth, H = window.innerHeight;
  const locked = cardPositions.get(card);
  if (locked && locked.x >= 16 && locked.x + w <= W - 16 && locked.y >= 16 && locked.y + h <= H - 16) return;
  const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 64;
  const section = activeSection ?? document.elementFromPoint(Math.min(W - 1, Math.max(0, x)), Math.min(H - 1, Math.max(0, y)))?.closest("section");
  const copy = section?.querySelector(".journey-copy");
  const copyTop = copy && getComputedStyle(copy.closest(".journey-copy-wrap") ?? copy).opacity !== "0" ? copy.getBoundingClientRect().top : H;
  const rail = section?.querySelector('nav[aria-label$="stages"]')?.getBoundingClientRect();
  const L = 16, R = Math.min(W - 16, rail?.left ? rail.left - 8 : W - (W < 768 ? 76 : 16)), T = header + 8, B = Math.min(H - 16, copyTop - 8);
  let px: number, py: number;
  if (x + 26 + w <= R) { px = x + 26; py = y - h / 2; }
  else if (x - 26 - w >= L) { px = x - 26 - w; py = y - h / 2; }
  else {
    // Narrow screens: stack above (or below) so the card never covers the airplane's tap target.
    px = Math.max(L, Math.min(R - w, x - w / 2));
    py = y - 30 - h >= T ? y - 30 - h : y + 30;
  }
  py = Math.max(T, Math.min(B - h, py));
  // Keep clear of the top-left HUD (address + wind readout).
  const hudEl = section?.querySelector(".journey-hud");
  const hud = hudEl?.getBoundingClientRect();
  if (hud && hud.width && hud.height) {
    const hb = { l: hud.left - 8, t: hud.top - 8, r: hud.right + 8, b: hud.bottom + 8 };
    if (px < hb.r && px + w > hb.l && py < hb.b && py + h > hb.t) {
      const below = hb.b;
      const coversPlane = (ty: number, tx: number) => x > tx - 4 && x < tx + w + 4 && y > ty - 4 && y < ty + h + 4;
      if (below + h <= B && !coversPlane(below, px)) py = below;
      else if (hb.r + w <= R && !coversPlane(py, hb.r)) px = hb.r;
      else if (below + h <= B) py = below;
      else px = Math.min(R - w, hb.r);
    }
  }
  card.style.transform = `translate3d(${px.toFixed(0)}px, ${py.toFixed(0)}px, 0)`;
  cardPositions.set(card, {x:Math.round(px),y:Math.round(py)});
}

/** Info card rendered on <body>, above every photo shade. Live values are written into data-k slots. */
export const TrafficCard = forwardRef<HTMLDivElement, { plane: TrafficPlaneInfo; runway: string; onOpen: () => void }>(function TrafficCard({ plane, runway, onOpen }, ref) {
  const photo = CARD_PHOTOS[plane.reg];
  return createPortal(
    <div ref={ref} data-traffic-card="" className="traffic-card pointer-events-auto fixed left-0 top-0 z-[70] w-[min(60vw,15rem)]" role="dialog" aria-label={`${plane.reg} details`}>
      {/* Stable full-width media slot also reserves space for a future accurate model or spin. */}
        <div data-card-media="" className="traffic-card-media relative mb-2 h-20 w-full">
          {photo && <AircraftMedia reg={plane.reg} photo={photo} />}
        </div>
        <span className="block min-w-0">
          <span className="block font-mono text-sm font-bold tracking-wider">{plane.reg}</span>
          {plane.nickname && <span className="block truncate text-xs leading-tight text-background">“{plane.nickname}”</span>}
          <span className="block truncate text-[11px] leading-tight text-background/65">{plane.type}</span>
        </span>
      <span className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
        <span data-k="alt" /><span data-k="kt" /><span data-k="phase" className="truncate font-bold uppercase tracking-[0.08em] text-[color:var(--radar)]" />
      </span>
      <span className="sr-only">Runway {runway}</span>
      <Button variant="ghost" onClick={onOpen} className="mt-1 flex min-h-11 w-full justify-start px-0 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--radar)]">View in fleet →</Button>
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
  void index; void seed;
  return (
    <g ref={tagRef} className="traffic-tag">
      <g className="traffic-history">{[0,1,2,3].map(i=><circle key={i} r={1.75} opacity={.28-i*.055}/>)}</g>
      <circle r={7} className="traffic-target" />
      <circle r={7} className="traffic-ping" />
      <line x1={5} y1={-5} x2={15} y2={-15} className="traffic-leader" />
      <rect x={14} y={-39} width={60} height={30} rx={2} className="traffic-pill" />
      <text ref={textRef} x={20} y={-27} className="traffic-label"><tspan className="traffic-call-title">{reg}</tspan><tspan className="traffic-call-data" x={20} dy={12}/></text>
      <circle r={22} fill="transparent" className="cursor-pointer" role="button" tabIndex={tabIndex} aria-label={label} {...hit} />
    </g>
  );
}

type Box = { l: number; t: number; r: number; b: number };
/** Constant-screen-size leg labels, outside their segment and clear of live UI/cards. */
/** Places a leg label on its own leg: rotated along the leg, 6px outside the pattern line. */
export function placePatternLabel(el: SVGTextElement, m: DOMMatrix, p:{x:number;y:number;dx:number;dy:number;tx:number;ty:number;len:number}, occupied:DOMRect[]) {
  const k=Math.hypot(m.a,m.b)||1,x=m.a*p.x+m.c*p.y+m.e,y=m.b*p.x+m.d*p.y+m.f;
  const section=el.closest('section');const blocked:DOMRect[]=[...occupied];
  document.querySelectorAll('header,[data-traffic-card]').forEach(n=>blocked.push(n.getBoundingClientRect()));
  section?.querySelectorAll('.journey-hud,nav[aria-label$="stages"],.journey-copy p,.journey-copy h2,.journey-copy a,[aria-label="Reset zoom"]').forEach(n=>{
    if(getComputedStyle(n).display==='none'||getComputedStyle(n.closest('.journey-copy-wrap')??n).opacity==='0')return;
    blocked.push(n.getBoundingClientRect());
  });
  const w=Math.max(20,el.getComputedTextLength()),h=10;
  let tx=m.a*p.tx+m.c*p.ty,ty=m.b*p.tx+m.d*p.ty;const tl=Math.hypot(tx,ty)||1;tx/=tl;ty/=tl;
  let nx=m.a*p.dx+m.c*p.dy,ny=m.b*p.dx+m.d*p.dy;const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  if(tx<0){tx=-tx;ty=-ty;} // keep text upright
  const angle=Math.atan2(ty,tx)*180/Math.PI,legPx=p.len*k,room=Math.max(0,(legPx-w)/2);
  const ex=(Math.abs(tx)*w+Math.abs(ty)*h)/2,ey=(Math.abs(ty)*w+Math.abs(tx)*h)/2;
  for(const shift of [0,.5,-.5,1,-1]){
    const d=6+h/2,s=shift*room,sx=x+nx*d+tx*s,sy=y+ny*d+ty*s;
    const b={l:sx-ex,t:sy-ey,r:sx+ex,b:sy+ey};
    if(b.l<8||b.r>innerWidth-8||b.t<8||b.b>innerHeight-8||blocked.some(r=>hits(b,{l:r.left-4,t:r.top-4,r:r.right+4,b:r.bottom+4})))continue;
    const point=new DOMPoint(sx,sy).matrixTransform(m.inverse());
    el.setAttribute('transform',`translate(${point.x} ${point.y}) rotate(${angle.toFixed(1)}) scale(${1/k})`);el.setAttribute('visibility','visible');
    occupied.push(new DOMRect(b.l,b.t,b.r-b.l,b.b-b.t));return;
  }
  el.setAttribute('visibility','hidden');
}
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
  section?.querySelectorAll('.journey-copy, .journey-hud, nav[aria-label$="stages"], [aria-label="Reset zoom"], [data-traffic-card]').forEach(el => { if(getComputedStyle(el.closest('.journey-copy-wrap') ?? el).opacity !== '0') add(el); });
  add(document.querySelector('[data-traffic-card]'));
  const rail = w < 768 ? 76 : 16;
  obstacleCache = { at: now, key: section, list, safe: { l: 16, t: 16, r: w - rail, b: h - 16 } };
  return obstacleCache;
}

type TagSide = { ox: number; oy: number; sy: number; W: number };
// Near sides first (block within ~40px of the airplane); |sy|>=2 only to dodge UI.
const SIDES = [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [1, -2], [-1, -2], [1, 2], [-1, 2], [1, -3], [-1, -3], [1, 3], [-1, 3]] as const;
const sideOf = (g: SVGGElement) => (g as SVGGElement & { __side?: TagSide }).__side;
const fits = (side: TagSide, pts: { x: number; y: number }[], list: Box[], safe: Box) => pts.every(({ x, y }) => {
  const box = { l: x + side.ox, t: y + side.oy, r: x + side.ox + side.W, b: y + side.oy + 30 };
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
export function fitTagSide(g: SVGGElement | null | undefined, pts: { x: number; y: number }[], occupied: Box[] = []) {
  if (!g) return false;
  const text = g.querySelector<SVGTextElement>(".traffic-label");
  const pill = g.querySelector<SVGRectElement>(".traffic-pill");
  const line = g.querySelector<SVGLineElement>(".traffic-leader");
  if (!text || !pill || !line) return false;
  obstacleCache = null;
  const { list, safe } = obstacles(g);
  const W = Math.ceil(Math.max(...Array.from(text.querySelectorAll('tspan')).map(t=>t.getComputedTextLength()), 60)) + 14, H = 30;
  for (const [sx, sy] of SIDES) {
    const ox = sx > 0 ? 10 : sx < 0 ? -10 - W : -Math.round(W / 2);
    let oy = sy < 0 ? -36 : 6;
    if (sx === 0) oy = sy < 0 ? -42 : 12;
    if (Math.abs(sy) === 2) oy = sy < 0 ? -52 : 22;
    if (Math.abs(sy) === 3) oy = sy < 0 ? -80 : 50;
    const side = { ox, oy, sy, W };
    if (!fits(side, pts, [...list,...occupied], safe)) continue;
    (g as SVGGElement & { __side?: TagSide }).__side = side;
    pill.setAttribute("x", String(ox)); pill.setAttribute("y", String(oy)); pill.setAttribute("width", String(W));
    text.setAttribute("x", String(ox + 7)); text.setAttribute("y", String(oy + 12.5));
    text.querySelectorAll('tspan').forEach(t=>t.setAttribute('x',String(ox+7)));
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

export function tagBounds(g: SVGGElement | null | undefined, x:number,y:number): Box | null {
  const s=g&&sideOf(g); return s ? {l:x+s.ox,t:y+s.oy,r:x+s.ox+s.W,b:y+s.oy+30} : null;
}

/** Places the tag group on its airplane, snapped to whole screen pixels (no sub-pixel shimmer). */
export function setTagPosition(g: SVGGElement | null | undefined, m: DOMMatrix | null | undefined, x: number, y: number) {
  if (!g) return;
  const k = m ? Math.hypot(m.a, m.b) || 1 : 1;
  let ux = x, uy = y;
  if (m && m.a) { ux = (Math.round(m.a * x + m.e) - m.e) / m.a; uy = (Math.round(m.d * y + m.f) - m.f) / m.d; }
  g.setAttribute("transform", `translate(${ux.toFixed(3)} ${uy.toFixed(3)}) scale(${(1 / k).toFixed(4)})`);
}
