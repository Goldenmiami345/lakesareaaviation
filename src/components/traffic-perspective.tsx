import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RadarTag, TrafficCard, useTrafficSelection, usePreloadCardPhotos, setTagPosition, setTagRing, ringRadius, fitTagSide, placeCard, radarAltitude, CARD_PHOTOS } from './traffic-ui';
import { fleet } from '../lib/site-data';
import { type PatternSample, type Wind, patternFor, patternWaypoints } from '../lib/traffic-pattern';
import { airportTraffic } from '../lib/site-data';
import { KLXL_OBLIQUE, KLXL_OBLIQUE_PATTERN, PX_PER_FT_MID, obliqueProject, patternToGround, projectGroundScaled, groundFromLatLon } from '../lib/oblique-view';
import { trafficSpanFeet, trafficModelScale, TrafficVector } from './traffic-vector';
import { useTrafficAnimation } from './use-traffic-animation';
import { usePatternPulse, OBLIQUE_PATTERN_PULSE } from './traffic-path';
import { useTrafficPatternMode } from '../lib/use-site-settings';
import { profileAirport, type TrafficConditions } from '../lib/wx-conditions';
import { OBLIQUE_SPRITES, OBLIQUE_PLANE_BOOST, SPRITE_FRAME, spriteFrame, frameViewBox } from '../lib/oblique-sprites';
import { useLiveTraffic } from '../lib/use-live-traffic';
import { patternTraffic, deadReckon, trackerUrl, compass, type LiveAircraft } from '../lib/live-traffic';
import { AircraftMedia } from './aircraft-media';
import { openTrafficCard } from '../lib/traffic-card-open';
import { useNavigate } from '@tanstack/react-router';

const OFFSETS=[.08,.68,.95] as const;
const FT=.3048,ELEV=KLXL_OBLIQUE_PATTERN.elevation;
const cam=KLXL_OBLIQUE.camera;
const deg=(r:number)=>((r*180/Math.PI)%360+360)%360;

/** One pose through the photo camera: ground metres + height + true track. Shared by simulated and live airplanes. */
function pose(e:number,n:number,hM:number,track:number,reg:string){
  const air=projectGroundScaled(e,n,hM),g=projectGroundScaled(e,n,0);
  const t=track*Math.PI/180,fwd={e:Math.sin(t),n:Math.cos(t)},right={e:Math.cos(t),n:-Math.sin(t)};
  const sprite=OBLIQUE_SPRITES[reg];
  const spanAt=(scale:number)=>trafficSpanFeet(reg)*scale*PX_PER_FT_MID*(sprite?OBLIQUE_PLANE_BOOST:trafficModelScale(reg));
  const matrix=(h:number,at:{x:number;y:number;scale:number})=>{
    const rx=projectGroundScaled(e+right.e,n+right.n,h),ty=projectGroundScaled(e-fwd.e,n-fwd.n,h);
    const dx=rx.x-at.x,dy=rx.y-at.y,ex=ty.x-at.x,ey=ty.y-at.y,unit=Math.max(Math.hypot(dx,dy),Math.hypot(ex,ey),.001),w=spanAt(at.scale);
    return `matrix(${dx/unit*w} ${dy/unit*w} ${ex/unit*w} ${ey/unit*w} ${at.x} ${at.y})`;
  };
  const span=spanAt(air.scale);
  let transform=matrix(hM,air),apply:((plane:SVGGElement)=>void)|undefined;
  if(sprite){
    const k=spriteFrame(track,deg(Math.atan2(e-cam.e,n-cam.n)));
    transform=`translate(${air.x} ${air.y}) scale(${span/(sprite.span*SPRITE_FRAME)})`;
    apply=(plane)=>{const s=plane.querySelector('svg[data-sprite]') as (SVGSVGElement&{__k?:number})|null;if(s&&s.__k!==k){s.__k=k;s.setAttribute('viewBox',frameViewBox(k));}};
  }
  return {x:air.x,y:air.y,z:air.z,span,transform,shadow:matrix(0,g),apply};
}

/** Airplane art: our 3D-model heading sprites when we have them, the drawn vector otherwise. */
function PlaneArt({reg,load}:{reg:string;load:boolean}){
  const s=OBLIQUE_SPRITES[reg];const F=SPRITE_FRAME;
  if(!s)return <TrafficVector reg={reg}/>;
  return <svg data-sprite="" x={-F/2} y={-F/2} width={F} height={F} viewBox={frameViewBox(0)} overflow="hidden">{load&&<image href={s.url} width={F*6} height={F*6}/>}</svg>;
}

export function TrafficPerspective({active,viewBox,wind=null,conditions}:{active:boolean;viewBox?:string;wind?:Wind|null;conditions?:TrafficConditions}){
  // Fixed camera south of the field looking NNE: only the runway-13 left-hand pattern lies in front of it.
  // Live wind still shapes climb, gusts and night dimming here; the live runway choice is shown on the Little Falls aerial.
  const wx=useMemo(()=>conditions?{...conditions,mode:'vfr' as const,approach:null}:undefined,[conditions]);
  const rwy=airportTraffic.KLXL.ends[0];
  const a=useMemo(()=>profileAirport(patternFor({...airportTraffic.KLXL,...KLXL_OBLIQUE_PATTERN},rwy),'vfr'),[rwy]);
  const svgRef=useRef<SVGSVGElement>(null),planeRefs=useRef<(SVGGElement|null)[]>([]),shadowRefs=useRef<(SVGGElement|null)[]>([]),tagRefs=useRef<(SVGGElement|null)[]>([]),textRefs=useRef<(SVGTextElement|null)[]>([]),cardRef=useRef<HTMLDivElement>(null);
  // Sprites download only once the stage has been active (first-load weight).
  const [armed,setArmed]=useState(false);useEffect(()=>{if(active)setArmed(true);},[active]);
  // Real ADS-B traffic in the pattern switches this view to live.
  const liveFields=useLiveTraffic(10_000,active);
  const [demo,setDemo]=useState<LiveAircraft[]|null>(null);
  // Preview-only check hook: ?livedemo flies two sample real-world reports (one ours, one not).
  useEffect(()=>{if(!import.meta.env.DEV||!new URLSearchParams(location.search).has('livedemo'))return;const t=Date.now();
    setDemo([{id:'N4383P',altFt:2100,kt:95,distNm:1.2,bearing:300,lat:45.9545,lon:-94.336,track:310,vs:0,t,hex:'a51c2d'},{id:'N512SR',callsign:'N512SR',type:'SR22',desc:'CIRRUS SR-22',altFt:1700,kt:120,distNm:1,bearing:200,lat:45.9495,lon:-94.3525,track:220,vs:500,t,hex:'a6b1f0',origin:'STC',destination:'BRD'}]);},[]);
  const live=useMemo(()=>demo??patternTraffic(liveFields?.['KLXL'],ELEV),[liveFields,demo]);
  const isLive=active&&live.length>0;
  const {selected,selectedRef,open,hitProps}=useTrafficSelection(active&&!isLive);
  const patternMode=useTrafficPatternMode();
  const patternShown=usePatternPulse(patternMode,active,selected!==null,OBLIQUE_PATTERN_PULSE);
  usePreloadCardPhotos(a.aircraft,active);
  const planes=useMemo(()=>a.aircraft.map(reg=>{const f=fleet.find(x=>x.registration===reg);return {reg,type:f?.name??'Training aircraft',nickname:f?.nickname??''};}),[a]);
  const project=useCallback((s:PatternSample,reg:string)=>{
    const angle=(s.heading-90)*Math.PI/180,g=patternToGround(s.x,s.y),g2=patternToGround(s.x+Math.cos(angle),s.y+Math.sin(angle));
    const p=pose(g.e,g.n,s.agl*FT,deg(Math.atan2(g2.e-g.e,g2.n-g.n)),reg);
    if(p.z<150)return {...p,lift:s.agl/a.tpaAgl,transform:`matrix(0 0 0 0 ${p.x} ${p.y})`,shadow:`matrix(0 0 0 0 ${p.x} ${p.y})`};
    return {...p,lift:s.agl/a.tpaAgl};
  },[a]);
  useTrafficAnimation({active:active&&!isLive,airport:a,wind,runwayHeading:rwy.trueHdg,regs:a.aircraft,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets:OFFSETS,...(wx?{conditions:wx}:{})});
  const path=useMemo(()=>{
    const w=patternWaypoints(a),commands:string[]=[];
    let connected=false;
    const sample=(x:number,y:number,agl:number)=>{
      const o=obliqueProject(x,y,agl);
      if(o.z<150){connected=false;return;}
      commands.push(`${connected?'L':'M'}${o.x.toFixed(1)} ${o.y.toFixed(1)}`);
      connected=true;
    };
    for(let i=0;i<w.length-1;i+=1){
      const p=w[i],q=w[i+1];
      if(!p||!q)continue;
      for(let k=0;k<12;k+=1){const t=k/12;sample(p.x+(q.x-p.x)*t,p.y+(q.y-p.y)*t,p.agl+(q.agl-p.agl)*t);}
    }
    const l=w[w.length-1];if(l)sample(l.x,l.y,l.agl);
    return commands.join(' ');
  },[a]);
  const info=selected!==null&&!isLive?planes[selected]:null;
  return <div className="absolute inset-0"><svg ref={svgRef} data-traffic="private-pilot" data-live={isLive?'':undefined} viewBox={viewBox??`0 0 ${KLXL_OBLIQUE.width} ${KLXL_OBLIQUE.height}`} preserveAspectRatio="xMidYMid slice" className="traffic-callouts absolute inset-0 h-full w-full" role="group" aria-label={isLive?`Live ADS-B traffic near Little Falls: ${live.length} aircraft`:`Left traffic for runway ${a.runway} at Little Falls, pattern altitude ${(a.elevation+a.tpaAgl).toLocaleString("en-US")} feet MSL`}>
    <path d={path} className="traffic-oblique-path" data-shown={patternShown&&!isLive?'':undefined} aria-hidden/>
    <g className="traffic-sim">
      {planes.map((p,i)=><g key={`s-${p.reg}`} ref={el=>{shadowRefs.current[i]=el;}} className="pointer-events-none traffic-ground-shadow" aria-hidden><TrafficVector reg={p.reg} shadow/></g>)}
      {planes.map((p,i)=><g key={p.reg} data-aircraft={p.reg} ref={el=>{planeRefs.current[i]=el;}} className="pointer-events-none" aria-hidden><PlaneArt reg={p.reg} load={armed}/></g>)}
      {active&&!isLive&&planes.map((p,i)=><RadarTag key={`t-${p.reg}`} reg={p.reg} index={i} seed={0} label={`${p.reg}, ${p.type}. Show details`} tabIndex={0} hit={hitProps(i,p.reg)} tagRef={el=>{tagRefs.current[i]=el;}} textRef={el=>{textRefs.current[i]=el;}}/>)}
    </g>
    {isLive&&<LivePlanes list={live} svgRef={svgRef}/>}
  </svg>
  {isLive&&<LiveChip svgRef={svgRef}/>}
  {info&&<TrafficCard key={info.reg} ref={cardRef} plane={info} runway={a.runway} onOpen={()=>open(info.reg)}/>}</div>;
}

/** Real aircraft from ADS-B, dead-reckoned between reports. */
function LivePlanes({list,svgRef}:{list:LiveAircraft[];svgRef:React.RefObject<SVGSVGElement|null>}){
  const planeRefs=useRef<Record<string,SVGGElement|null>>({}),shadowRefs=useRef<Record<string,SVGGElement|null>>({}),tagRefs=useRef<Record<string,SVGGElement|null>>({}),textRefs=useRef<Record<string,SVGTextElement|null>>({});
  const cardRef=useRef<HTMLDivElement>(null);
  const [sel,setSel]=useState<string|null>(null);
  const selRef=useRef(sel);selRef.current=sel;
  const listRef=useRef(list);listRef.current=list;
  useEffect(()=>{if(sel&&!list.some(x=>x.id===sel))setSel(null);},[list,sel]);
  useEffect(()=>{if(!sel)return;const close=(e:PointerEvent)=>{if((e.target as Element|null)?.closest?.('[data-traffic-hit],[data-traffic-card]'))return;setSel(null);};document.addEventListener('pointerdown',close,true);return()=>document.removeEventListener('pointerdown',close,true);},[sel]);
  useEffect(()=>{if(!sel)return;return openTrafficCard();},[sel]);
  useEffect(()=>{
    let raf=0;const placed=new Set<string>();
    const host=svgRef.current?.closest('[data-journey-section]');
    const draw=()=>{
      if(host?.hasAttribute('data-offstage')){raf=requestAnimationFrame(draw);return;}
      const m=svgRef.current?.getScreenCTM();const k=m?Math.hypot(m.a,m.b)||1:1;
      for(const a of listRef.current){
        const dt=(Date.now()-(a.t??Date.now()))/1000;
        const pos=deadReckon({lat:a.lat!,lon:a.lon!,kt:a.kt,track:a.track??0},dt);
        const g=groundFromLatLon(pos.lat,pos.lon);
        const altFt=Math.max(ELEV,a.altFt+(a.vs??0)*Math.min(30,Math.max(0,dt))/60);
        const p=pose(g.e,g.n,(altFt-ELEV)*FT,a.track??0,a.id);
        // Aircraft at or behind the photo's camera cannot be drawn honestly: hide them.
        const behind=p.z<300;
        const plane=planeRefs.current[a.id];if(plane){plane.style.visibility=behind?'hidden':'';plane.setAttribute('transform',p.transform);p.apply?.(plane);}
        const sh=shadowRefs.current[a.id];if(sh)sh.style.visibility=behind?'hidden':'';
        if(tagRefs.current[a.id])tagRefs.current[a.id]!.style.visibility=behind?'hidden':'';
        if(behind)continue;
        shadowRefs.current[a.id]?.setAttribute('transform',p.shadow);
        const tag=tagRefs.current[a.id];setTagPosition(tag,m,p.x,p.y);
        if(m&&tag){
          setTagRing(tag,ringRadius(p.span*k));
          const data=textRefs.current[a.id]?.querySelector('.traffic-call-data');if(data)data.textContent=`${radarAltitude(altFt)} · ${a.kt}`;
          const sx=m.a*p.x+m.c*p.y+m.e,sy=m.b*p.x+m.d*p.y+m.f;
          if(!placed.has(a.id)&&fitTagSide(tag,[{x:sx,y:sy}]))placed.add(a.id);
          if(selRef.current===a.id)placeCard(cardRef.current,sx,sy,svgRef.current?.closest('section'));
        }
      }
      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[list,svgRef]);
  const info=sel?list.find(x=>x.id===sel)??null:null;
  return <>
    {list.map(a=><g key={`ls-${a.id}`} ref={el=>{shadowRefs.current[a.id]=el;}} className="pointer-events-none traffic-ground-shadow" opacity={.3} aria-hidden><TrafficVector reg={a.id} shadow/></g>)}
    {list.map(a=><g key={`l-${a.id}`} data-aircraft={a.id} data-live-aircraft="" ref={el=>{planeRefs.current[a.id]=el;}} className="pointer-events-none" aria-hidden><PlaneArt reg={a.id} load/></g>)}
    {list.map((a,i)=><g key={`lt-${a.id}`} className="traffic-live-tag-wrap"><RadarTag reg={a.callsign&&a.callsign!==a.id?a.callsign:a.id} index={i} seed={0} label={`${a.id}, live aircraft. Show flight details`} tabIndex={0}
      hit={{'data-traffic-hit':'',onClick:()=>setSel(s=>s===a.id?null:a.id),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter')setSel(a.id);if(e.key==='Escape')setSel(null);}}}
      tagRef={el=>{tagRefs.current[a.id]=el;el?.classList.add('is-live-tag');}} textRef={el=>{textRefs.current[a.id]=el;}}/></g>)}
    {info&&<LiveCard key={info.id} ref={cardRef} a={info}/>}
  </>;
}

export const LiveCard=({a,ref}:{a:LiveAircraft;ref:React.RefObject<HTMLDivElement|null>})=>{
  const ours=fleet.find(f=>f.registration===a.id);
  const navigate=useNavigate();
  const vs=a.vs??0;
  return createPortal(<div ref={ref} data-traffic-card="" className="traffic-card pointer-events-auto fixed left-0 top-0 z-[70] w-[min(64vw,16rem)]" role="dialog" aria-label={`${a.id} live flight details`}>
    {ours&&CARD_PHOTOS[a.id]&&<div data-card-media="" className="traffic-card-media relative mb-2 h-20 w-full"><AircraftMedia reg={a.id} photo={CARD_PHOTOS[a.id]!}/></div>}
    <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.16em] text-[color:var(--radar)]"><span aria-hidden className="traffic-live-dot"/>Live ADS-B</span>
    <span className="mt-1 block font-mono text-sm font-bold tracking-wider">{a.id}{a.callsign&&a.callsign!==a.id?` · ${a.callsign}`:''}</span>
    {ours?<span className="block truncate text-xs leading-tight text-background">{ours.nickname?`“${ours.nickname}” · `:''}{ours.name}</span>
      :<span className="block truncate text-xs leading-tight text-background/70">{a.desc||a.type||'Aircraft type not broadcast'}</span>}
    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
      <dt className="text-background/60">Alt</dt><dd>{a.altFt.toLocaleString('en-US')} ft</dd>
      <dt className="text-background/60">Speed</dt><dd>{a.kt} kt</dd>
      <dt className="text-background/60">Heading</dt><dd>{String(Math.round(a.track??0)).padStart(3,'0')}° {compass(a.track??0)}</dd>
      <dt className="text-background/60">Vert</dt><dd>{vs>100?'▲':vs<-100?'▼':'—'} {Math.abs(Math.round(vs/10)*10)} fpm</dd>
      <dt className="text-background/60">From</dt><dd>{a.origin??'Not filed'}</dd>
      <dt className="text-background/60">To</dt><dd>{a.destination??'Not filed'}</dd>
    </dl>
    {ours
      ?<button type="button" onClick={()=>void navigate({to:'/fleet',hash:a.id.toLowerCase(),hashScrollIntoView:false})} className="mt-1 flex min-h-11 w-full items-center text-left text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--radar)]">View in fleet →</button>
      :<a href={trackerUrl(a)} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 w-full items-center text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--radar)]">Track ↗</a>}
  </div>,document.body);
};

/** Subtle "LIVE" tag at the top left, just above the stage HUD (portalled so the photo shade never dims it). */
export function LiveChip({svgRef}:{svgRef:React.RefObject<SVGSVGElement|null>}){
  const [host,setHost]=useState<Element|null>(null);
  useEffect(()=>{setHost(svgRef.current?.closest('section')?.querySelector('.journey-hud')??null);},[svgRef]);
  if(!host)return null;
  return createPortal(<p className="traffic-live-chip pointer-events-none absolute left-0 top-full mt-2 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.2em]"><span aria-hidden className="traffic-live-dot"/>Live · ADS-B</p>,host);
}
