import { useEffect, useMemo, useRef } from "react";
import { RadarTag, layoutTag, TrafficCard, placeCard, radarAltitude, useTrafficSelection, writeCard } from "./traffic-ui";
import { fleet } from "../lib/site-data";
import { lapSeconds, patternWaypoints, sampleAtTime } from "../lib/traffic-pattern";
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, PX_PER_FT_MID, obliqueProject } from "../lib/oblique-view";
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
  const svgRef = useRef<SVGSVGElement>(null);
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const shadowRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const tagRefs = useRef<(SVGGElement | null)[]>([]);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { selected, selectedRef, open, hitProps } = useTrafficSelection(active);
  const a = KLXL_OBLIQUE_PATTERN;
  const points = useMemo(() => patternWaypoints(a), [a]);
  const planes = useMemo(() => a.aircraft.map((reg) => {
    const f = fleet.find((x) => x.registration === reg);
    return { reg, sp: SIDE[reg]!, type: f?.name ?? "Training aircraft", nickname: f?.nickname ?? "" };
  }), [a]);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lap = lapSeconds(a, points);
    const start = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      // Same calm one-third real-time pace as the airport aerials.
      const secs = reduce ? 0 : ((now - start) / 1000) * 0.33;
      const m = svgRef.current?.getScreenCTM();
      const k = m ? Math.hypot(m.a, m.b) || 1 : 1;
      planes.forEach((p, i) => {
        const t = secs + lap * [0.08, 0.68, 0.95][i]!;
        const s = sampleAtTime(a, t, points);
        const ahead = sampleAtTime(a, t + 1.5, points);
        // True 3D projection through the picture's camera: altitude lifts the plane.
        const g = obliqueProject(s.x, s.y);
        const air = obliqueProject(s.x, s.y, s.agl);
        const air2 = obliqueProject(ahead.x, ahead.y, ahead.agl);
        const dx = air2.x - air.x, dy = air2.y - air.y;
        const flip = dx < 0;
        const ang = Math.max(-14, Math.min(14, (Math.atan2(flip ? -dy : dy, Math.abs(dx) || 0.001) * 180) / Math.PI * 0.6));
        const w = p.sp.span * air.scale * PX_PER_FT_MID * VISUAL_SCALE;
        planeRefs.current[i]?.setAttribute("transform", `translate(${air.x.toFixed(1)} ${air.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${flip ? -w : w} ${w})`);
        const sh = shadowRefs.current[i];
        if (sh) {
          sh.setAttribute("cx", g.x.toFixed(1)); sh.setAttribute("cy", g.y.toFixed(1));
          sh.setAttribute("rx", (w * 0.42).toFixed(1)); sh.setAttribute("ry", (w * 0.09).toFixed(1));
          sh.setAttribute("opacity", Math.max(0.06, 0.4 - (s.agl / a.tpaAgl) * 0.32).toFixed(2));
        }
        const cy = air.y - w * 0.15;
        tagRefs.current[i]?.setAttribute("transform", `translate(${air.x.toFixed(1)} ${cy.toFixed(1)}) scale(${(1 / k).toFixed(4)})`);
        layoutTag(tagRefs.current[i]);
        const label = `${p.reg} / ${radarAltitude(s.msl)}`;
        const tx = textRefs.current[i];
        if (tx && tx.textContent !== label) tx.textContent = label;
        if (selectedRef.current === i && m) {
          placeCard(cardRef.current, m.a * air.x + m.c * cy + m.e, m.b * air.x + m.d * cy + m.f);
          writeCard(cardRef.current, s);
        }
      });
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, a, points, planes, selectedRef]);

  const info = selected !== null ? planes[selected] : null;

  return (
    <div className="absolute inset-0">
      <svg ref={svgRef} viewBox={`0 0 ${KLXL_OBLIQUE.width} ${KLXL_OBLIQUE.height}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="group" aria-label="Live left traffic for runway 13 at Little Falls, pattern altitude 2,123 feet MSL">
        <defs><filter id="pp-soft"><feGaussianBlur stdDeviation="1.2" /></filter></defs>
        {planes.map((p, i) => <ellipse key={`sh-${p.reg}`} ref={(el) => { shadowRefs.current[i] = el; }} fill="black" filter="url(#pp-soft)" aria-hidden className="pointer-events-none" />)}
        {planes.map((p, i) => (
          <g key={p.reg} ref={(el) => { planeRefs.current[i] = el; }} className="pointer-events-none" aria-hidden>
            {/* unit-wide sprite, anchored at its wheels */}
            <image href={p.sp.src} x={-0.5} y={-1 / p.sp.aspect} width={1} height={1 / p.sp.aspect} style={{ filter: "saturate(0.85) brightness(0.95) drop-shadow(0 0 0.4px rgb(0 0 0 / 0.4))" }} />
          </g>
        ))}
        {active && planes.map((p, i) => (
          <RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} hit={hitProps(i, p.reg)} tagRef={(el) => { tagRefs.current[i] = el; }} textRef={(el) => { textRefs.current[i] = el; }} />
        ))}
      </svg>
      {info && <TrafficCard ref={cardRef} plane={info} runway={a.runway} onOpen={() => open(info.reg)} />}
    </div>
  );
}
