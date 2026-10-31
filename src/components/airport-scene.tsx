import { useLayoutEffect, useRef, useState } from 'react';
import { airportFraming } from '../lib/airport-framing';
import type { PatternAirport, Wind } from '../lib/traffic-pattern';
import { TrafficPattern } from './traffic-pattern';
import { airportBackdrops } from '../lib/airport-backdrops';
export function AirportScene({ airport, active, photo, original, wind, runwayHeading }: { airport: PatternAirport; active: boolean; photo: string; original: string; wind: Wind|null; runwayHeading: number }) {
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
      const phone=w<640;
      const local=(r:DOMRect)=>({left:dx+r.left-(vp?.left??0),right:dx+r.right-(vp?.left??0),top:dy+r.top-(vp?.top??0),bottom:dy+r.bottom-(vp?.top??0)});
      const protectedRects=[hud,rail].filter((r):r is DOMRect=>!!r).map(local);
      section?.querySelectorAll('.journey-copy p,.journey-copy h2,.journey-copy a').forEach(node=>{
        if(getComputedStyle(node).display==='none')return;
        const range=document.createRange();range.selectNodeContents(node);
        const r=node.tagName==='A'?node.getBoundingClientRect():range.getBoundingClientRect();
        if(r.width&&r.height)protectedRects.push(local(r));
      });
      setFrame(airportFraming(airport,w,h,phone,phone?{left:dx+18,top:dy+Math.max(165,(hud?.bottom??165)-(vp?.top??0)+20),right:dx+(rail?.left??w-65)-(vp?.left??0)-18,bottom:dy+(copy?.top??h-200)-(vp?.top??0)-20}:{left:dx+18,top:dy+88,right:dx+(vp?.width??w)-18,bottom:dy+(vp?.height??h)-18},phone?[]:protectedRects));
    };
    update();const ro=new ResizeObserver(update);ro.observe(el);window.addEventListener('resize',update);
    return()=>{ro.disconnect();window.removeEventListener('resize',update);};
  },[airport,active]);
  const backdrop=airportBackdrops[airport.ident];
  return <div ref={ref} data-airport-framing={airport.ident} data-default-zoom={frame?.multiplier.toFixed(4)} className="absolute inset-0">
    {frame&&<><svg viewBox={frame.viewBox} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>{backdrop&&<image href={backdrop.url} width="1920" height="1920" transform={backdrop.transform} preserveAspectRatio="none" />}<image href={photo} x="265" y="-300" width="970" height="2100" preserveAspectRatio="none" /><image href={original} x="0" y="0" width="1500" height="1500" preserveAspectRatio="none" /></svg><TrafficPattern airport={airport} active={active} viewBox={frame.viewBox} wind={wind} runwayHeading={runwayHeading}/></>}
  </div>;
}