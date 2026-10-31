import { useCallback, useMemo, useRef } from 'react';
import { RadarTag, TrafficCard, useTrafficSelection, usePreloadCardPhotos } from './traffic-ui';
import { fleet } from '../lib/site-data';
import { type PatternSample, type Wind } from '../lib/traffic-pattern';
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, PX_PER_FT_MID, obliqueProject } from '../lib/oblique-view';
import { trafficSpanFeet, TrafficVector } from './traffic-vector';
import { useTrafficAnimation } from './use-traffic-animation';
const OFFSETS=[.08,.68,.95] as const;
const VISUAL_SCALE=3;
export function TrafficPerspective({active,viewBox,wind=null}:{active:boolean;viewBox?:string;wind?:Wind|null}){
  const a=KLXL_OBLIQUE_PATTERN;
  const svgRef=useRef<SVGSVGElement>(null),planeRefs=useRef<(SVGGElement|null)[]>([]),shadowRefs=useRef<(SVGGElement|null)[]>([]),tagRefs=useRef<(SVGGElement|null)[]>([]),textRefs=useRef<(SVGTextElement|null)[]>([]),cardRef=useRef<HTMLDivElement>(null);
  const {selected,selectedRef,open,hitProps}=useTrafficSelection(active);
  usePreloadCardPhotos(a.aircraft,active);
  const planes=useMemo(()=>a.aircraft.map(reg=>{const f=fleet.find(x=>x.registration===reg);return {reg,type:f?.name??'Training aircraft',nickname:f?.nickname??''};}),[a]);
  const project=useCallback((s:PatternSample,reg:string)=>{
    const air=obliqueProject(s.x,s.y,s.agl),g=obliqueProject(s.x,s.y);
    const angle=(s.heading-90)*Math.PI/180;
    // Local SVG x is across the wings, y points toward the tail. Project both
    // axes through the SAME camera as the runway, retaining the existing span
    // envelope; no independent tag elevation offset hides the actual airplane.
    const right={x:-Math.sin(angle),y:Math.cos(angle)},tail={x:-Math.cos(angle),y:-Math.sin(angle)};
    const projectMatrix=(alt:number,at:{x:number;y:number})=>{
      const rx=obliqueProject(s.x+right.x,s.y+right.y,alt),ty=obliqueProject(s.x+tail.x,s.y+tail.y,alt);
      const dx=rx.x-at.x,dy=rx.y-at.y,ex=ty.x-at.x,ey=ty.y-at.y;
      const unit=Math.max(Math.hypot(dx,dy),Math.hypot(ex,ey),.001);
      const w=trafficSpanFeet(reg)*atScale(alt)*PX_PER_FT_MID*VISUAL_SCALE;
      return `matrix(${dx/unit*w} ${dy/unit*w} ${ex/unit*w} ${ey/unit*w} ${at.x} ${at.y})`;
    };
    const atScale=(alt:number)=>alt===s.agl?air.scale:g.scale;
    return {x:air.x,y:air.y,lift:s.agl/a.tpaAgl,transform:projectMatrix(s.agl,air),shadow:projectMatrix(0,g)};
  },[a]);
  useTrafficAnimation({active,airport:a,wind,runwayHeading:131,regs:a.aircraft,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets:OFFSETS});
  const info=selected!==null?planes[selected]:null;
  return <div className="absolute inset-0"><svg ref={svgRef} data-traffic="private-pilot" viewBox={viewBox??`0 0 ${KLXL_OBLIQUE.width} ${KLXL_OBLIQUE.height}`} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label="Live left traffic for runway 13 at Little Falls, pattern altitude 2,123 feet MSL">
    {planes.map((p,i)=><g key={`s-${p.reg}`} ref={el=>{shadowRefs.current[i]=el;}} className="pointer-events-none traffic-ground-shadow" aria-hidden><TrafficVector reg={p.reg} shadow/></g>)}
    {planes.map((p,i)=><g key={p.reg} data-aircraft={p.reg} ref={el=>{planeRefs.current[i]=el;}} className="pointer-events-none" aria-hidden><TrafficVector reg={p.reg}/></g>)}
    {active&&planes.map((p,i)=><RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} hit={hitProps(i,p.reg)} tagRef={el=>{tagRefs.current[i]=el;}} textRef={el=>{textRefs.current[i]=el;}}/>)}
  </svg>{info&&<TrafficCard key={info.reg} ref={cardRef} plane={info} runway={a.runway} onOpen={()=>open(info.reg)}/>}</div>;
}
