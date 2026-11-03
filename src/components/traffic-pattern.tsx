import { useCallback, useMemo, useRef } from 'react';
import { fleet } from '../lib/site-data';
import { feetPerPixel, patternAltitude, type PatternAirport, type PatternSample, type Wind } from '../lib/traffic-pattern';
import { RadarTag, TrafficCard, useTrafficSelection, usePreloadCardPhotos } from './traffic-ui';
import { trafficSpanFeet, trafficModelScale, TrafficVector, hasTopRender } from './traffic-vector';
import { useTrafficPatternMode } from '../lib/use-site-settings';
import { useTrafficAnimation } from './use-traffic-animation';
import { TrafficPath } from './traffic-path';
import { visibleApproach, type TrafficConditions } from '../lib/wx-conditions';

// Keep the existing threefold presentation footprint; map timing is independent
// of this legacy visual multiplier. Never increase aircraft size for visibility.
export function TrafficPattern({airport,active,viewBox='0 0 1500 1500',wind=null,runwayHeading=Number(airport.runway)*10,conditions}:{airport:PatternAirport;active:boolean;viewBox?:string;wind?:Wind|null;runwayHeading?:number;conditions?:TrafficConditions}){
  const svgRef=useRef<SVGSVGElement>(null),planeRefs=useRef<(SVGGElement|null)[]>([]),shadowRefs=useRef<(SVGGElement|null)[]>([]),tagRefs=useRef<(SVGGElement|null)[]>([]),textRefs=useRef<(SVGTextElement|null)[]>([]),cardRef=useRef<HTMLDivElement>(null);
  const {selected,selectedRef,open,hitProps}=useTrafficSelection(active);
  const patternMode=useTrafficPatternMode();
  // IFR straight-in starts/ends at the visible map edge so the aircraft is always on screen.
  const cond=useMemo(()=>conditions?.mode==='ifr'?{...conditions,...visibleApproach(airport,viewBox)}:conditions,[conditions,airport,viewBox]);
  usePreloadCardPhotos(airport.aircraft,active);
  const planes=useMemo(()=>airport.aircraft.map(reg=>{const f=fleet.find(x=>x.registration===reg);return {reg,type:f?.name??'Training aircraft',nickname:f?.nickname??''};}),[airport]);
  const project=useCallback((s:PatternSample,reg:string)=>{
    const top=hasTopRender(reg);
    const w=trafficSpanFeet(reg,top)/feetPerPixel(airport)*trafficModelScale(reg,top);
    const lift=s.agl/airport.tpaAgl;
    return {x:s.x,y:s.y,lift,transform:`translate(${s.x} ${s.y}) rotate(${s.heading}) scale(${w*(1+lift*.12)})`,shadow:`translate(${s.x+2+lift*10} ${s.y+2.5+lift*12}) rotate(${s.heading}) scale(${w})`};
  },[airport]);
  useTrafficAnimation({active,airport,wind,runwayHeading,regs:airport.aircraft,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,...(cond?{conditions:cond}:{})});
  const info=selected!==null?planes[selected]:null;
  return <div className="absolute inset-0"><svg ref={svgRef} data-traffic={airport.ident} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label={`Live ${airport.side} traffic pattern for runway ${airport.runway} at ${airport.ident}, pattern altitude ${patternAltitude(airport)} feet MSL`}>
    {patternMode!=='off'&&cond?.mode!=='ifr'&&<TrafficPath airport={airport} active={active} mode={patternMode} paused={selected!==null}/>}
    {planes.map((p,i)=><g key={`s-${p.reg}`} ref={el=>{shadowRefs.current[i]=el;}} aria-hidden className="pointer-events-none traffic-ground-shadow"><TrafficVector reg={p.reg} shadow topRender/></g>)}
    {planes.map((p,i)=><g key={p.reg} data-aircraft={p.reg} ref={el=>{planeRefs.current[i]=el;}} className="pointer-events-none" aria-hidden><TrafficVector reg={p.reg} topRender/></g>)}
    {active&&planes.map((p,i)=><RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} hit={hitProps(i,p.reg)} tagRef={el=>{tagRefs.current[i]=el;}} textRef={el=>{textRefs.current[i]=el;}}/>)}
  </svg>{info&&<TrafficCard key={info.reg} ref={cardRef} plane={info} runway={airport.runway} onOpen={()=>open(info.reg)}/>}</div>;
}
