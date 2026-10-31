import { useLayoutEffect, useRef, useState } from 'react';
import { airportFraming } from '../lib/airport-framing';
import type { PatternAirport, Wind } from '../lib/traffic-pattern';
import { TrafficPattern } from './traffic-pattern';
export function AirportScene({ airport, active, photo, wind, runwayHeading }: { airport: PatternAirport; active: boolean; photo: string; wind: Wind|null; runwayHeading: number }) {
  const ref=useRef<HTMLDivElement>(null);
  const [frame,setFrame]=useState<ReturnType<typeof airportFraming>|null>(null);
  useLayoutEffect(()=>{
    const el=ref.current;if(!el)return;
    const update=()=>{
      const w=el.clientWidth,h=el.clientHeight,section=el.closest('section');
      const vp=section?.querySelector('.journey-viewport')?.getBoundingClientRect();
      const copy=section?.querySelector('.journey-copy-wrap')?.getBoundingClientRect();
      const hud=section?.querySelector('.journey-hud')?.getBoundingClientRect();
      const rail=section?.querySelector('nav[aria-label$="stages"]')?.getBoundingClientRect();
      const dx=(w-(vp?.width??w))/2,dy=(h-(vp?.height??h))/2;
      setFrame(airportFraming(airport,w,h,w<640,{left:dx+18,top:dy+Math.max(165,(hud?.bottom??165)-(vp?.top??0)+20),right:dx+(rail?.left??w-65)-(vp?.left??0)-18,bottom:dy+(copy?.top??h-200)-(vp?.top??0)-20}));
    };
    update();const ro=new ResizeObserver(update);ro.observe(el);window.addEventListener('resize',update);
    return()=>{ro.disconnect();window.removeEventListener('resize',update);};
  },[airport,active]);
  return <div ref={ref} data-airport-framing={airport.ident} data-default-zoom={frame?.multiplier.toFixed(4)} className="absolute inset-0">
    {frame&&<><svg viewBox={frame.viewBox} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden><image href={photo} x="265" y="-300" width="970" height="2100" preserveAspectRatio="none" /></svg><TrafficPattern airport={airport} active={active} viewBox={frame.viewBox} wind={wind} runwayHeading={runwayHeading}/></>}
  </div>;
}