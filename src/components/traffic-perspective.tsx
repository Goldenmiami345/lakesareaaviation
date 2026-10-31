import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { fleet } from "../lib/site-data";
import { lapSeconds, patternWaypoints, sampleAtTime } from "../lib/traffic-pattern";
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, obliqueProject } from "../lib/oblique-view";
import n6717a from "../assets/traffic-side/n6717a.webp";
import n8570b from "../assets/traffic-side/n8570b.webp";
import n3353p from "../assets/traffic-side/n3353p.webp";

// Three-quarter cut-outs of each real fleet photo (same paint and tail number).
const SIDE: Record<string, { src: string; aspect: number; span: number }> = {
  N6717A: { src: n6717a, aspect: 360 / 157, span: 36 },
  N8570B: { src: n8570b, aspect: 360 / 160, span: 36 },
  N3353P: { src: n3353p, aspect: 360 / 150, span: 37 },
};
// Real size is a few pixels at this distance; drawn 3x like the aerial views.
const VISUAL_SCALE = 3;

/** KLXL runway 13 left traffic, drawn into the oblique Private Pilot approach photo. */
export function TrafficPerspective({ active }: { active: boolean }) {
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const shadowRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [info, setInfo] = useState<string>("");
  const hoveredRef = useRef<number | null>(null);
  const cardRef = useRef<SVGGElement>(null);
  hoveredRef.current = hovered;
  const navigate = useNavigate();
  const a = KLXL_OBLIQUE_PATTERN;
  const points = useMemo(() => patternWaypoints(a), [a]);
  const planes = useMemo(() => a.aircraft.map((reg) => ({ reg, sp: SIDE[reg]!, f: fleet.find((x) => x.registration === reg) })), [a]);

  useEffect(() => {
    if (!active) { setHovered(null); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lap = lapSeconds(a, points);
    const start = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      // Same calm one-third real-time pace as the airport aerials.
      const secs = reduce ? 0 : ((now - start) / 1000) * 0.33;
      planes.forEach((p, i) => {
        const t = secs + lap * [0.02, 0.45, 0.86][i]!;
        const s = sampleAtTime(a, t, points);
        const ahead = sampleAtTime(a, t + 1.5, points);
        const g = obliqueProject(s.x, s.y);
        const g2 = obliqueProject(ahead.x, ahead.y);
        const lift = (s.agl / a.tpaAgl) * KLXL_OBLIQUE.liftPx * g.scale;
        const lift2 = (ahead.agl / a.tpaAgl) * KLXL_OBLIQUE.liftPx * g2.scale;
        const dx = g2.x - g.x, dy = (g2.y - lift2) - (g.y - lift);
        const flip = dx < 0;
        const ang = Math.max(-14, Math.min(14, (Math.atan2(flip ? -dy : dy, Math.abs(dx) || 0.001) * 180) / Math.PI * 0.6));
        const w = p.sp.span * g.scale * KLXL_OBLIQUE.pxPerFt * VISUAL_SCALE;
        planeRefs.current[i]?.setAttribute("transform", `translate(${g.x.toFixed(1)} ${(g.y - lift).toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${flip ? -w : w} ${w})`);
        const sh = shadowRefs.current[i];
        if (sh) {
          sh.setAttribute("cx", g.x.toFixed(1)); sh.setAttribute("cy", g.y.toFixed(1));
          sh.setAttribute("rx", (w * 0.42).toFixed(1)); sh.setAttribute("ry", (w * 0.09).toFixed(1));
          sh.setAttribute("opacity", Math.max(0.06, 0.4 - (s.agl / a.tpaAgl) * 0.32).toFixed(2));
        }
        if (hoveredRef.current === i) cardRef.current?.setAttribute("transform", `translate(${Math.min(KLXL_OBLIQUE.width - 240, g.x + 14).toFixed(0)} ${(g.y - lift - 70).toFixed(0)})`);
        if (hoveredRef.current === i) setInfo(`${s.phase} · ${s.msl.toLocaleString("en-US")} ft MSL · ${s.knots} kt`);
      });
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, a, points, planes]);

  const open = (reg: string) => void navigate({ to: "/fleet", hash: reg.toLowerCase(), hashScrollIntoView: false });

  return (
    <svg viewBox={`0 0 ${KLXL_OBLIQUE.width} ${KLXL_OBLIQUE.height}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="group" aria-label="Live left traffic for runway 13 at Little Falls, pattern altitude 2,123 feet MSL">
      <defs><filter id="pp-soft"><feGaussianBlur stdDeviation="1.2" /></filter></defs>
      {planes.map((p, i) => <ellipse key={`sh-${p.reg}`} ref={(el) => { shadowRefs.current[i] = el; }} fill="black" filter="url(#pp-soft)" aria-hidden />)}
      {planes.map((p, i) => (
        <g
          key={p.reg}
          ref={(el) => { planeRefs.current[i] = el; }}
          className="traffic-plane cursor-pointer"
          role="link"
          tabIndex={active ? 0 : -1}
          aria-label={`${p.reg}, ${p.f?.name ?? "training aircraft"}. Open in fleet`}
          onPointerEnter={() => setHovered(i)}
          onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
          onClick={() => open(p.reg)}
          onKeyDown={(e) => { if (e.key === "Enter") open(p.reg); }}
        >
          <rect x={-0.7} y={-0.6} width={1.4} height={1.2} fill="transparent" />
          {/* unit-wide sprite, anchored at its wheels */}
          <image href={p.sp.src} x={-0.5} y={-1 / p.sp.aspect} width={1} height={1 / p.sp.aspect} style={{ filter: "saturate(0.85) brightness(0.95) drop-shadow(0 0 0.4px rgb(0 0 0 / 0.4))" }} />
        </g>
      ))}
      {hovered !== null && planes[hovered] && (
        <g ref={cardRef} className="pointer-events-none" aria-hidden>
          <rect width={236} height={50} rx={3} fill="rgb(15 20 30 / 0.88)" />
          <text x={10} y={20} fontSize={13} fontWeight={700} fill="white" fontFamily="monospace">{planes[hovered]!.reg} · {planes[hovered]!.f?.name ?? ""}</text>
          <text x={10} y={38} fontSize={11} fill="rgb(255 255 255 / 0.75)" fontFamily="monospace">{info}</text>
        </g>
      )}
    </svg>
  );
}
