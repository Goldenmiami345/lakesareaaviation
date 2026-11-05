import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fleet } from '../lib/site-data';
import { feetPerPixel, patternAltitude, type PatternAirport, type PatternSample, type Wind } from '../lib/traffic-pattern';
import { RadarTag, TrafficCard, useTrafficSelection, usePreloadCardPhotos, setTagPosition, setTagRing, ringRadius, fitTagSide, placeCard, radarAltitude } from './traffic-ui';
import { useLiveTraffic } from '../lib/use-live-traffic';
import { patternTraffic, deadReckon, mapPixel, visibleOnMap, type LiveAircraft } from '../lib/live-traffic';
import { WX_FIELDS } from '../lib/wx-stations';
import { LiveCard, LiveChip } from './traffic-perspective';
import { trafficSpanFeet, trafficModelScale, TrafficVector, hasTopRender } from './traffic-vector';
import { useTrafficPatternMode } from '../lib/use-site-settings';
import { useTrafficAnimation } from './use-traffic-animation';
import { TrafficPath } from './traffic-path';
import { visibleApproach, type TrafficConditions } from '../lib/wx-conditions';

// Keep the existing threefold presentation footprint; map timing is independent
// of this legacy visual multiplier. Never increase aircraft size for visibility.
export function TrafficPattern({airport,active,viewBox='0 0 1500 1500',wind=null,runwayHeading=Number(airport.runway)*10,conditions}:{airport:PatternAirport;active:boolean;viewBox?:string;wind?:Wind|null;runwayHeading?:number;conditions?:TrafficConditions}){
  const svgRef=useRef<SVGSVGElement>(null),planeRefs=useRef<(SVGGElement|null)[]>([]),shadowRefs=useRef<(SVGGElement|null)[]>([]),tagRefs=useRef<(SVGGElement|null)[]>([]),textRefs=useRef<(SVGTextElement|null)[]>([]),cardRef=useRef<HTMLDivElement>(null);
  // Real ADS-B traffic in this field's pattern (and on this map) replaces the simulated airplanes.
  const toPx=useMemo(()=>{const f=WX_FIELDS[airport.ident as keyof typeof WX_FIELDS];if(!f)return null;const mid={x:(airport.threshold.x+airport.end.x)/2,y:(airport.threshold.y+airport.end.y)/2},fpp=feetPerPixel(airport);return (lat:number,lon:number)=>mapPixel(f,mid,fpp,lat,lon);},[airport]);
  const liveFields=useLiveTraffic(10_000,active&&!!toPx);
  const live=useMemo(()=>{if(!toPx)return [];const box=viewBox.split(/[ ,]+/).map(Number) as [number,number,number,number];return visibleOnMap(patternTraffic(liveFields?.[airport.ident],airport.elevation),toPx,box);},[liveFields,airport,toPx,viewBox]);
  const isLive=active&&live.length>0;
  const {selected,selectedRef,open,hitProps}=useTrafficSelection(active&&!isLive);
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
  useTrafficAnimation({active:active&&!isLive,airport,wind,runwayHeading,regs:airport.aircraft,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,...(cond?{conditions:cond}:{})});
  const info=selected!==null&&!isLive?planes[selected]:null;
  return <div className="absolute inset-0"><svg ref={svgRef} data-traffic={airport.ident} data-live={isLive?'':undefined} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label={`Live ${airport.side} traffic pattern for runway ${airport.runway} at ${airport.ident}, pattern altitude ${patternAltitude(airport)} feet MSL`}>
    {!isLive&&patternMode!=='off'&&cond?.mode!=='ifr'&&<TrafficPath airport={airport} active={active} mode={patternMode} paused={selected!==null}/>}
    <g className="traffic-sim" style={isLive?{display:'none'}:undefined}>
    {planes.map((p,i)=><g key={`s-${p.reg}`} ref={el=>{shadowRefs.current[i]=el;}} aria-hidden className="pointer-events-none traffic-ground-shadow"><TrafficVector reg={p.reg} shadow topRender/></g>)}
    {planes.map((p,i)=><g key={p.reg} data-aircraft={p.reg} ref={el=>{planeRefs.current[i]=el;}} className="pointer-events-none" aria-hidden><TrafficVector reg={p.reg} topRender/></g>)}
    {active&&!isLive&&planes.map((p,i)=><RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} hit={hitProps(i,p.reg)} tagRef={el=>{tagRefs.current[i]=el;}} textRef={el=>{textRefs.current[i]=el;}}/>)}
    </g>
    {isLive&&toPx&&<MapLivePlanes list={live} svgRef={svgRef} toPx={toPx} airport={airport}/>}
  </svg>{isLive&&<LiveChip svgRef={svgRef}/>}{info&&<TrafficCard key={info.reg} ref={cardRef} plane={info} runway={airport.runway} onOpen={()=>open(info.reg)}/>}</div>;
}

/** Real aircraft on the airport map, dead-reckoned between reports. School tail numbers draw as their own airplane. */
function MapLivePlanes({list,svgRef,toPx,airport}:{list:LiveAircraft[];svgRef:React.RefObject<SVGSVGElement|null>;toPx:(lat:number,lon:number)=>{x:number;y:number};airport:PatternAirport}){
  const planeRefs=useRef<Record<string,SVGGElement|null>>({}),shadowRefs=useRef<Record<string,SVGGElement|null>>({}),tagRefs=useRef<Record<string,SVGGElement|null>>({}),textRefs=useRef<Record<string,SVGTextElement|null>>({});
  const cardRef=useRef<HTMLDivElement>(null);
  const [sel,setSel]=useState<string|null>(null);
  const selRef=useRef(sel);selRef.current=sel;
  const listRef=useRef(list);listRef.current=list;
  useEffect(()=>{if(sel&&!list.some(x=>x.id===sel))setSel(null);},[list,sel]);
  useEffect(()=>{if(!sel)return;const close=(e:PointerEvent)=>{if((e.target as Element|null)?.closest?.('[data-traffic-hit],[data-traffic-card]'))return;setSel(null);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[sel]);
  useEffect(()=>{
    let raf=0;const placed=new Set<string>();const fpp=feetPerPixel(airport);
    const host=svgRef.current?.closest('[data-journey-section]');
    const draw=()=>{
      if(!host?.hasAttribute('data-offstage')){
        const m=svgRef.current?.getScreenCTM();const k=m?Math.hypot(m.a,m.b)||1:1;
        for(const a of listRef.current){
          const dt=(Date.now()-(a.t??Date.now()))/1000;
          const pos=deadReckon({lat:a.lat!,lon:a.lon!,kt:a.kt,track:a.track??0},dt);
          const {x,y}=toPx(pos.lat,pos.lon);
          const altFt=Math.max(airport.elevation,a.altFt+(a.vs??0)*Math.min(30,Math.max(0,dt))/60);
          const lift=Math.min(1.5,Math.max(0,(altFt-airport.elevation)/airport.tpaAgl));
          const top=hasTopRender(a.id),w=trafficSpanFeet(a.id,top)/fpp*trafficModelScale(a.id,top),hdg=a.track??0;
          planeRefs.current[a.id]?.setAttribute('transform',`translate(${x} ${y}) rotate(${hdg}) scale(${w*(1+lift*.12)})`);
          shadowRefs.current[a.id]?.setAttribute('transform',`translate(${x+2+lift*10} ${y+2.5+lift*12}) rotate(${hdg}) scale(${w})`);
          const tag=tagRefs.current[a.id];setTagPosition(tag,m,x,y);
          if(m&&tag){
            setTagRing(tag,ringRadius(w*k));
            const data=textRefs.current[a.id]?.querySelector('.traffic-call-data');if(data)data.textContent=`${radarAltitude(altFt)} · ${a.kt}`;
            const sx=m.a*x+m.c*y+m.e,sy=m.b*x+m.d*y+m.f;
            if(!placed.has(a.id)&&fitTagSide(tag,[{x:sx,y:sy}]))placed.add(a.id);
            if(selRef.current===a.id)placeCard(cardRef.current,sx,sy,svgRef.current?.closest('section'));
          }
        }
      }
      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[list,svgRef,toPx,airport]);
  const info=sel?list.find(x=>x.id===sel)??null:null;
  return <>
    {list.map(a=><g key={`ls-${a.id}`} ref={el=>{shadowRefs.current[a.id]=el;}} className="pointer-events-none traffic-ground-shadow" aria-hidden><TrafficVector reg={a.id} shadow topRender/></g>)}
    {list.map(a=><g key={`l-${a.id}`} data-aircraft={a.id} data-live-aircraft="" ref={el=>{planeRefs.current[a.id]=el;}} className="pointer-events-none" aria-hidden><TrafficVector reg={a.id} topRender/></g>)}
    {list.map((a,i)=><g key={`lt-${a.id}`} className="traffic-live-tag-wrap"><RadarTag reg={a.id} index={i} seed={0} label={`${a.id}, live aircraft. Show flight details`} tabIndex={0}
      hit={{'data-traffic-hit':'',onClick:()=>setSel(s=>s===a.id?null:a.id),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter')setSel(a.id);if(e.key==='Escape')setSel(null);}}}
      tagRef={el=>{tagRefs.current[a.id]=el;el?.classList.add('is-live-tag');}} textRef={el=>{textRefs.current[a.id]=el;}}/></g>)}
    {info&&<LiveCard key={info.id} ref={cardRef} a={info}/>}
  </>;
}
