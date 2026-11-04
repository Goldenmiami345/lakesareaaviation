import { useCallback, useMemo, useRef } from 'react';
import { RadarTag, TrafficCard, useTrafficSelection, usePreloadCardPhotos } from './traffic-ui';
import { fleet } from '../lib/site-data';
import { type PatternSample, type Wind, pickRunway, patternFor, patternWaypoints } from '../lib/traffic-pattern';
import { airportTraffic } from '../lib/site-data';
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, PX_PER_FT_MID, obliqueProject } from '../lib/oblique-view';
import { trafficSpanFeet, trafficModelScale, TrafficVector } from './traffic-vector';
import { useTrafficAnimation } from './use-traffic-animation';
import { usePatternPulse } from './traffic-path';
import { useTrafficPatternMode } from '../lib/use-site-settings';
import { profileAirport, type TrafficConditions } from '../lib/wx-conditions';
const OFFSETS=[.08,.68,.95] as const;
export function TrafficPerspective({active,viewBox,wind=null,conditions}:{active:boolean;viewBox?:string;wind?:Wind|null;conditions?:TrafficConditions}){
  // This view always flies the full VFR pattern. Live weather still picks the
  // runway, climb rate, gust jitter and night dimming, but never closes the
  // pattern or swaps in a single straight-in aircraft.
  const wx=useMemo(()=>conditions?{...conditions,mode:'vfr' as const,approach:null}:undefined,[conditions]);
  // Same live-wind runway choice as the aerial view; local space swaps ends for 31.
  const rwy=useMemo(()=>pickRunway(airportTraffic.KLXL,wind?{dir:wind.dir,kt:wind.kt}:null),[wind]);
  const a=useMemo(()=>profileAirport(patternFor({...airportTraffic.KLXL,...KLXL_OBLIQUE_PATTERN},rwy),'vfr'),[rwy]);
  const svgRef=useRef<SVGSVGElement>(null),planeRefs=useRef<(SVGGElement|null)[]>([]),shadowRefs=useRef<(SVGGElement|null)[]>([]),tagRefs=useRef<(SVGGElement|null)[]>([]),textRefs=useRef<(SVGTextElement|null)[]>([]),cardRef=useRef<HTMLDivElement>(null);
  const {selected,selectedRef,open,hitProps}=useTrafficSelection(active);
  // Pattern line pulses briefly, like the airport-map drawn pattern; pauses while a card is open.
  const patternMode=useTrafficPatternMode();
  const patternShown=usePatternPulse(patternMode,active,selected!==null);
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
      const w=trafficSpanFeet(reg)*atScale(alt)*PX_PER_FT_MID*trafficModelScale(reg);
      return `matrix(${dx/unit*w} ${dy/unit*w} ${ex/unit*w} ${ey/unit*w} ${at.x} ${at.y})`;
    };
    const atScale=(alt:number)=>alt===s.agl?air.scale:g.scale;
    return {x:air.x,y:air.y,lift:s.agl/a.tpaAgl,transform:projectMatrix(s.agl,air),shadow:projectMatrix(0,g)};
  },[a]);
  useTrafficAnimation({active,airport:a,wind,runwayHeading:rwy.trueHdg,regs:a.aircraft,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets:OFFSETS,...(wx?{conditions:wx}:{})});
  // Projected pattern line at its real altitude on each leg (same waypoints the airplanes fly).
  const path=useMemo(()=>{const w=patternWaypoints(a);const pts:string[]=[];for(let i=0;i<w.length-1;i+=1){const p=w[i]!,q=w[i+1]!;for(let k=0;k<12;k+=1){const t=k/12,o=obliqueProject(p.x+(q.x-p.x)*t,p.y+(q.y-p.y)*t,p.agl+(q.agl-p.agl)*t);pts.push(`${o.x.toFixed(1)},${o.y.toFixed(1)}`);}}const l=w[w.length-1]!,o=obliqueProject(l.x,l.y,l.agl);pts.push(`${o.x.toFixed(1)},${o.y.toFixed(1)}`);return pts.join(' ');},[a]);
  const info=selected!==null?planes[selected]:null;
  return <div className="absolute inset-0"><svg ref={svgRef} data-traffic="private-pilot" viewBox={viewBox??`0 0 ${KLXL_OBLIQUE.width} ${KLXL_OBLIQUE.height}`} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label={`Live left traffic for runway ${a.runway} at Little Falls, pattern altitude ${(a.elevation+a.tpaAgl).toLocaleString("en-US")} feet MSL`}>
    <polyline points={path} className="traffic-oblique-path" data-shown={patternShown?'':undefined} aria-hidden/>
    {planes.map((p,i)=><g key={`s-${p.reg}`} ref={el=>{shadowRefs.current[i]=el;}} className="pointer-events-none traffic-ground-shadow" aria-hidden><TrafficVector reg={p.reg} shadow/></g>)}
    {planes.map((p,i)=><g key={p.reg} data-aircraft={p.reg} ref={el=>{planeRefs.current[i]=el;}} className="pointer-events-none" aria-hidden><TrafficVector reg={p.reg}/></g>)}
    {active&&planes.map((p,i)=><RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} compact hit={hitProps(i,p.reg)} tagRef={el=>{tagRefs.current[i]=el;}} textRef={el=>{textRefs.current[i]=el;}}/>)}
  </svg>{info&&<TrafficCard key={info.reg} ref={cardRef} plane={info} runway={a.runway} onOpen={()=>open(info.reg)}/>}</div>;
}
