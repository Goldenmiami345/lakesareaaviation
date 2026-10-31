import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { fleet } from "../lib/site-data";
import { feetPerPixel, lapSeconds, patternAltitude, patternWaypoints, sampleAtTime, type PatternAirport } from "../lib/traffic-pattern";
import n6717a from "../assets/traffic/n6717a.webp";
import n8570b from "../assets/traffic/n8570b.webp";
import n3353p from "../assets/traffic/n3353p.webp";
import n7108g from "../assets/traffic/n7108g.webp";
import n6641f from "../assets/traffic/n6641f.webp";
import n11059 from "../assets/traffic/n11059.webp";

// Top-down renders made from each airplane's real fleet photo, plus real wingspans (ft).
const SPRITES: Record<string, { src: string; span: number; aspect: number }> = {
  N6717A: { src: n6717a, span: 36, aspect: 0.88 }, N8570B: { src: n8570b, span: 36, aspect: 0.88 },
  N7108G: { src: n7108g, span: 36, aspect: 0.88 }, N6641F: { src: n6641f, span: 33, aspect: 0.88 },
  N3353P: { src: n3353p, span: 37, aspect: 0.82 }, N11059: { src: n11059, span: 34, aspect: 0.88 },
};
// Real scale is only a few pixels; draw at 3x so the airplanes stay readable but small.
const VISUAL_SCALE = 3;

type Info = { reg: string; type: string; nickname: string; src: string; w: number; h: number };

export function TrafficPattern({ airport, active }: { airport: PatternAirport; active: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const shadowRefs = useRef<(SVGGElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  hoveredRef.current = hovered;
  const navigate = useNavigate();
  const points = useMemo(() => patternWaypoints(airport), [airport]);
  const planes: Info[] = useMemo(() => airport.aircraft.map((reg) => {
    const f = fleet.find((x) => x.registration === reg);
    const sp = SPRITES[reg] ?? SPRITES.N6717A!;
    const w = (sp.span / feetPerPixel(airport)) * VISUAL_SCALE;
    return { reg, type: f?.name ?? "Training aircraft", nickname: f?.nickname ?? "", src: sp.src, w, h: w / sp.aspect };
  }), [airport]);
  const tpa = patternAltitude(airport);

  useEffect(() => {
    if (!active) { setHovered(null); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); if (visible) loop(); });
    if (svgRef.current) io.observe(svgRef.current);
    const start = performance.now();
    const lap = lapSeconds(airport, points);
    const draw = (now: number) => {
      const secs = reduce ? 0 : (now - start) / 1000;
      planes.forEach((_, i) => {
        const s = sampleAtTime(airport, secs + (lap * i) / planes.length + lap * 0.05, points);
        const lift = s.agl / airport.tpaAgl;
        const scale = 1 + lift * 0.12;
        planeRefs.current[i]?.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.heading.toFixed(1)}) scale(${scale.toFixed(3)})`);
        shadowRefs.current[i]?.setAttribute("transform", `translate(${(s.x + 4 + lift * 22).toFixed(1)} ${(s.y + 5 + lift * 26).toFixed(1)}) rotate(${s.heading.toFixed(1)})`);
        shadowRefs.current[i]?.setAttribute("opacity", (0.45 - lift * 0.25).toFixed(2));
        if (hoveredRef.current === i && cardRef.current && svgRef.current && wrapRef.current) {
          const m = svgRef.current.getScreenCTM();
          if (m) {
            const px = Math.min(window.innerWidth - 220, m.a * s.x + m.c * s.y + m.e);
            const py = m.b * s.x + m.d * s.y + m.f;
            cardRef.current.style.transform = `translate3d(${(px + 22).toFixed(0)}px, ${(py - 30).toFixed(0)}px, 0)`;
          }
          const set = (k: string, v: string) => { const el = cardRef.current?.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; };
          set("alt", `${s.msl.toLocaleString("en-US")} ft MSL`);
          set("agl", `${Math.round(s.agl).toLocaleString("en-US")} AGL`);
          set("kt", `${s.knots} kt`);
          set("phase", s.phase);
        }
      });
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now: number) => { draw(now); if (visible && !reduce) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    };
    draw(performance.now());
    loop();
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [active, airport, planes, points]);

  const open = (reg: string) => void navigate({ to: "/fleet", hash: reg.toLowerCase() });
  const info = hovered !== null ? planes[hovered] : null;

  return (
    <div ref={wrapRef} className="absolute inset-0" onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(null); }}>
      <svg ref={svgRef} viewBox="0 0 1500 1500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="group" aria-label={`Live ${airport.side} traffic pattern for runway ${airport.runway} at ${airport.ident}, pattern altitude ${tpa.toLocaleString("en-US")} feet MSL`}>
        {planes.map((p, i) => (
          <g key={`s-${p.reg}`} ref={(el) => { shadowRefs.current[i] = el; }} aria-hidden><image href={p.src} x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} style={{ filter: "brightness(0) blur(1px)" }} /></g>
        ))}
        {planes.map((p, i) => (
          <g
            key={p.reg}
            ref={(el) => { planeRefs.current[i] = el; }}
            className={`traffic-plane cursor-pointer ${hovered === i ? "is-hovered" : ""}`}
            role="link"
            tabIndex={active ? 0 : -1}
            aria-label={`${p.reg}, ${p.type}. Open in fleet`}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovered(i); }}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            onClick={() => { if (hovered === i) open(p.reg); else setHovered(i); }}
            onKeyDown={(e) => { if (e.key === "Enter") open(p.reg); }}
          >
            <circle r={34} fill="transparent" />
            <image href={p.src} x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} style={{ filter: "drop-shadow(0 0 0.6px rgb(0 0 0 / 0.5))" }} />
          </g>
        ))}
      </svg>
      {info && createPortal(
        <div ref={cardRef} className="traffic-card pointer-events-auto fixed left-0 top-0 z-[45] w-52" role="status" onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(null); }}>
          <button type="button" onClick={() => open(info.reg)} className="block w-full text-left">
            <span className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-bold tracking-wider">{info.reg}</span><span data-k="phase" className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary" /></span>
            <span className="mt-0.5 block text-xs text-background/70">{info.type}{info.nickname ? ` · “${info.nickname}”` : ""}</span>
            <span className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[11px] tabular-nums">
              <span data-k="alt" /><span data-k="kt" className="text-right" />
              <span data-k="agl" className="text-background/60" /><span className="text-right text-background/60">RWY {airport.runway}</span>
            </span>
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">View in fleet →</span>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
