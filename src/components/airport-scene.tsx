import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { airportFraming } from '../lib/airport-framing';
import type { PatternAirport, Wind } from '../lib/traffic-pattern';
import { TrafficPattern } from './traffic-pattern';
import { airportBackdrops } from '../lib/airport-backdrops';
import type { TrafficConditions } from '../lib/wx-conditions';
export function AirportScene({ airport, active, warm=false, photo, original, wind, runwayHeading, conditions }: { airport: PatternAirport; active: boolean; /** Neighbouring stage: get its 3D map airplanes ready before it fades in. */ warm?: boolean; photo: string; original: string; wind: Wind|null; runwayHeading: number; conditions?: TrafficConditions }) {
  const ref=useRef<HTMLDivElement>(null);
  const [frame,setFrame]=useState<ReturnType<typeof airportFraming>|null>(null);
  // Airport imagery is ~15,000px down the page: request nothing until the journey is
  // within ~1.5 viewports, or a programmatic jump/glide targets it (journey-target event).
  const [near,setNear]=useState(false);
  const [phone,setPhone]=useState(false);
  useEffect(()=>{
    const section=ref.current?.closest('section');if(!section)return;
    const mq=window.matchMedia('(max-width: 639px)');const onMq=()=>setPhone(mq.matches);onMq();mq.addEventListener('change',onMq);
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setNear(true);io.disconnect();}},{rootMargin:'150% 0px 150% 0px'});
    io.observe(section);
    const onTarget=(e:Event)=>{const y=(e as CustomEvent<number>).detail,r=section.getBoundingClientRect(),top=r.top+window.scrollY;if(y>=top-1.5*innerHeight&&y<=top+r.height)setNear(true);};
    window.addEventListener('journey-target',onTarget);
    return()=>{io.disconnect();mq.removeEventListener('change',onMq);window.removeEventListener('journey-target',onTarget);};
  },[]);
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
    // Phone toolbars fire window resize while scrolling; only a width change can move the framing.
    let lastW=window.innerWidth;const onResize=()=>{if(window.innerWidth===lastW)return;lastW=window.innerWidth;update();};
    update();const ro=new ResizeObserver(update);ro.observe(el);window.addEventListener('resize',onResize);
    return()=>{ro.disconnect();window.removeEventListener('resize',onResize);};
  },[airport,active]);
  const backdrop=airportBackdrops[airport.ident];
  return <div ref={ref} data-airport-framing={airport.ident} data-default-zoom={frame?.multiplier.toFixed(4)} className="absolute inset-0">
    {frame&&near&&<><svg viewBox={frame.viewBox} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>{backdrop&&<image href={backdrop.url} width="1920" height="1920" transform={backdrop.transform} preserveAspectRatio="none" />}{phone?<image href={photo} x="265" y="-300" width="970" height="2100" preserveAspectRatio="none" />:<image href={original} x="0" y="0" width="1500" height="1500" preserveAspectRatio="none" />}</svg><TrafficPattern airport={airport} active={active} warm={warm} viewBox={frame.viewBox} wind={wind} runwayHeading={runwayHeading} {...(conditions?{conditions}:{})}/></>}
  </div>;
}