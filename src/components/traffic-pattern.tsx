import { useEffect, useMemo, useRef } from "react";
import { fleet } from "../lib/site-data";
import { feetPerPixel, lapSeconds, patternAltitude, patternWaypoints, positionReport, sampleAtTime, type PatternAirport } from "../lib/traffic-pattern";
import { RadarTag, layoutTag, TrafficCard, placeCard, useTrafficSelection, usePreloadCardPhotos, writeCard } from "./traffic-ui";
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
const SEEDS: Record<string, number> = { KLXL: 0, "18V": 1, P52: 2 };
// Radio-call callouts: one on screen per airport, shown ~3.5 s, at least 1.5 s of quiet between calls.
export const CALLOUT_MS = 3500;
export const CALLOUT_GAP_MS = 1500;
const CALLOUT_STALE_MS = 9000;

export function TrafficPattern({ airport, active, viewBox = "0 0 1500 1500" }: { airport: PatternAirport; active: boolean; viewBox?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const shadowRefs = useRef<(SVGGElement | null)[]>([]);
  const tagRefs = useRef<(SVGGElement | null)[]>([]);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { selected, selectedRef, open, hitProps } = useTrafficSelection(active);
  usePreloadCardPhotos(airport.aircraft, active);
  const points = useMemo(() => patternWaypoints(airport), [airport]);
  const planes = useMemo(() => airport.aircraft.map((reg) => {
    const f = fleet.find((x) => x.registration === reg);
    const sp = SPRITES[reg] ?? SPRITES["N6717A"]!;
    const w = (sp.span / feetPerPixel(airport)) * VISUAL_SCALE;
    return { reg, type: f?.name ?? "Training aircraft", nickname: f?.nickname ?? "", src: sp.src, w, h: w / sp.aspect };
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
    const lap = lapSeconds(airport, points);
    const prev: (string | null)[] = planes.map(() => null);
    let queue: { i: number; text: string; at: number }[] = [];
    let current: { i: number; until: number } | null = null;
    let nextAt = 0;
    const draw = (now: number) => {
      // Played at one-third real time so the airplanes drift calmly across the aerial.
      const secs = reduce ? 0 : ((now - start) / 1000) * 0.33;
      const m = svgRef.current?.getScreenCTM();
      const k = m ? Math.hypot(m.a, m.b) || 1 : 1;
      planes.forEach((p, i) => {
        // Evenly staggered around the circuit so takeoff, crosswind, downwind, base and final are all occupied.
        const s = sampleAtTime(airport, secs + (lap * i) / planes.length + lap * 0.05, points);
        const lift = s.agl / airport.tpaAgl;
        const scale = 1 + lift * 0.12;
        planeRefs.current[i]?.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.heading.toFixed(1)}) scale(${scale.toFixed(3)})`);
        shadowRefs.current[i]?.setAttribute("transform", `translate(${(s.x + 2 + lift * 10).toFixed(1)} ${(s.y + 2.5 + lift * 12).toFixed(1)}) rotate(${s.heading.toFixed(1)})`);
        shadowRefs.current[i]?.setAttribute("opacity", (0.45 - lift * 0.25).toFixed(2));
        tagRefs.current[i]?.setAttribute("transform", `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${(1 / k).toFixed(4)})`);
        if (prev[i] !== s.phase) {
          const report = prev[i] !== null && !reduce ? positionReport(s.phase, airport.runway, airport.side) : null;
          prev[i] = s.phase;
          if (report) queue = queue.filter((q) => q.i !== i).concat({ i, text: `${p.reg} · ${report}`, at: now });
        }
        if (selectedRef.current === i && m) {
          placeCard(cardRef.current, m.a * s.x + m.c * s.y + m.e, m.b * s.x + m.d * s.y + m.f);
          writeCard(cardRef.current, s);
        }
      });
      if (current && now >= current.until) {
        tagRefs.current[current.i]?.classList.remove("is-calling");
        current = null; nextAt = now + CALLOUT_GAP_MS;
      }
      queue = queue.filter((q) => now - q.at < CALLOUT_STALE_MS);
      if (!current && now >= nextAt && queue.length) {
        const q = queue.shift()!;
        const t = textRefs.current[q.i];
        if (t) t.textContent = q.text;
        current = { i: q.i, until: now + CALLOUT_MS };
        tagRefs.current[q.i]?.classList.add("is-calling");
      }
      if (current) layoutTag(tagRefs.current[current.i]);
    };
    const loop = () => {
      cancelAnimationFrame(raf);
      const tick = (now: number) => { draw(now); if (visible && !reduce) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    };
    draw(performance.now());
    loop();
    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", onResize); tagRefs.current.forEach((g) => g?.classList.remove("is-calling")); };
  }, [active, airport, planes, points, selectedRef]);

  const info = selected !== null ? planes[selected] : null;

  return (
    <div className="absolute inset-0">
      <svg ref={svgRef} data-traffic={airport.ident} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label={`Live ${airport.side} traffic pattern for runway ${airport.runway} at ${airport.ident}, pattern altitude ${tpa.toLocaleString("en-US")} feet MSL`}>
        {planes.map((p, i) => (
          <g key={`s-${p.reg}`} ref={(el) => { shadowRefs.current[i] = el; }} aria-hidden className="pointer-events-none"><image href={p.src} x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} style={{ filter: "brightness(0) blur(0.6px)" }} /></g>
        ))}
        {planes.map((p, i) => (
          <g key={p.reg} ref={(el) => { planeRefs.current[i] = el; }} className="pointer-events-none" aria-hidden>
            <image href={p.src} x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} style={{ filter: "drop-shadow(0 0 0.6px rgb(0 0 0 / 0.5))" }} />
          </g>
        ))}
        {active && planes.map((p, i) => (
          <RadarTag
            key={`t-${p.reg}`}
            reg={p.reg}
            index={i}
            seed={SEEDS[airport.ident] ?? 0}
            label={`${p.reg}, ${p.type}. Show details`}
            tabIndex={0}
            hit={hitProps(i, p.reg)}
            tagRef={(el) => { tagRefs.current[i] = el; }}
            textRef={(el) => { textRefs.current[i] = el; }}
          />
        ))}
      </svg>
      {info && <TrafficCard ref={cardRef} plane={info} runway={airport.runway} onOpen={() => open(info.reg)} />}
    </div>
  );
}
