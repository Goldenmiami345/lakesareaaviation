import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { fleet } from "../lib/site-data";
import { patternAltitude, patternWaypoints, samplePattern, type PatternAirport } from "../lib/traffic-pattern";

const SINGLE = "M0,-44 C5,-44 6,-36 6,-28 L6,-14 L50,-13 C52,-13 52,-3 50,-3 L6,-2 L4,24 L19,27 C21,28 21,34 19,34 L3,35 L0,40 L-3,35 L-19,34 C-21,34 -21,28 -19,27 L-4,24 L-6,-2 L-50,-3 C-52,-3 -52,-13 -50,-13 L-6,-14 L-6,-28 C-6,-36 -5,-44 0,-44 Z";
const TWIN = "M0,-40 C5,-40 6,-32 6,-24 L6,-8 L52,-4 C54,-4 54,4 52,4 L6,6 L4,26 L20,30 C22,31 22,36 20,36 L3,37 L0,42 L-3,37 L-20,36 C-22,36 -22,31 -20,30 L-4,26 L-6,6 L-52,4 C-54,4 -54,-4 -52,-4 L-6,-8 L-6,-24 C-6,-32 -5,-40 0,-40 Z M18,-22 C22,-22 23,-16 23,-10 L23,8 L13,8 L13,-10 C13,-16 14,-22 18,-22 Z M-18,-22 C-14,-22 -13,-16 -13,-10 L-13,8 L-23,8 L-23,-10 C-23,-16 -22,-22 -18,-22 Z";
const SIZE = 0.62;

type Info = { reg: string; type: string; nickname: string; twin: boolean };

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
    return { reg, type: f?.name ?? "Training aircraft", nickname: f?.nickname ?? "", twin: Boolean(f?.name.includes("Apache")) };
  }), [airport]);
  const tpa = patternAltitude(airport);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); if (visible) loop(); });
    if (svgRef.current) io.observe(svgRef.current);
    const start = performance.now();
    const LAP_MS = 52000;
    const draw = (now: number) => {
      const base = reduce ? 0 : (now - start) / LAP_MS;
      planes.forEach((_, i) => {
        const s = samplePattern(airport, base + i / planes.length + 0.05, points);
        const lift = s.agl / airport.tpaAgl;
        const scale = SIZE * (1 + lift * 0.28);
        planeRefs.current[i]?.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.heading.toFixed(1)}) scale(${scale.toFixed(3)})`);
        shadowRefs.current[i]?.setAttribute("transform", `translate(${(s.x + 4 + lift * 22).toFixed(1)} ${(s.y + 5 + lift * 26).toFixed(1)}) rotate(${s.heading.toFixed(1)}) scale(${SIZE.toFixed(3)})`);
        shadowRefs.current[i]?.setAttribute("opacity", (0.45 - lift * 0.25).toFixed(2));
        if (hoveredRef.current === i && cardRef.current && svgRef.current && wrapRef.current) {
          const m = svgRef.current.getScreenCTM();
          const box = wrapRef.current.getBoundingClientRect();
          if (m) {
            const px = m.a * s.x + m.c * s.y + m.e - box.left;
            const py = m.b * s.x + m.d * s.y + m.f - box.top;
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

  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const open = (reg: string) => void navigate({ to: "/fleet", hash: reg.toLowerCase() });
  const info = hovered !== null ? planes[hovered] : null;

  return (
    <div ref={wrapRef} className="absolute inset-0" onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(null); }}>
      <svg ref={svgRef} viewBox="0 0 1500 1500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="group" aria-label={`Live ${airport.side} traffic pattern for runway ${airport.runway} at ${airport.ident}, pattern altitude ${tpa.toLocaleString("en-US")} feet MSL`}>
        <path d={path} fill="none" className="traffic-path" strokeWidth={2.2} strokeDasharray="10 12" vectorEffect="non-scaling-stroke" />
        {planes.map((p, i) => (
          <g key={`s-${p.reg}`} ref={(el) => { shadowRefs.current[i] = el; }} className="traffic-shadow" aria-hidden><path d={p.twin ? TWIN : SINGLE} /></g>
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
            <circle r={70} fill="transparent" />
            <path d={p.twin ? TWIN : SINGLE} className="traffic-body" />
            <path d="M-6,-14 L6,-14 L6,-2 L-6,-2 Z" className="traffic-trim" />
          </g>
        ))}
      </svg>
      {info && (
        <div ref={cardRef} className="traffic-card pointer-events-auto absolute left-0 top-0 z-10 w-52" role="status">
          <button type="button" onClick={() => open(info.reg)} className="block w-full text-left">
            <span className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-bold tracking-wider">{info.reg}</span><span data-k="phase" className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary" /></span>
            <span className="mt-0.5 block text-xs text-background/70">{info.type}{info.nickname ? ` · “${info.nickname}”` : ""}</span>
            <span className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[11px] tabular-nums">
              <span data-k="alt" /><span data-k="kt" className="text-right" />
              <span data-k="agl" className="text-background/60" /><span className="text-right text-background/60">RWY {airport.runway}</span>
            </span>
            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">View in fleet →</span>
          </button>
        </div>
      )}
    </div>
  );
}
