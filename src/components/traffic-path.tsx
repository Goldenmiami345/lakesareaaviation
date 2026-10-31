import { useEffect, useMemo, useRef } from 'react';
import { trafficPath } from '../lib/traffic-path';
import type { PatternAirport } from '../lib/traffic-pattern';
import { placePatternLabel } from './traffic-ui';
export function TrafficPath({airport,active}:{airport:PatternAirport;active:boolean}) {
  const path=useMemo(()=>trafficPath(airport),[airport]),ref=useRef<SVGGElement>(null);
  useEffect(()=>{
    if(!active)return;
    let frame=0,last=0;
    const update=(now:number)=>{
      if(now-last>120){last=now;const m=ref.current?.ownerSVGElement?.getScreenCTM();const occupied:DOMRect[]=[];
        ref.current?.querySelectorAll<SVGTextElement>('text').forEach((el,i)=>{const label=path.labels[i];if(m&&label)placePatternLabel(el,m,label,occupied);});
      }
      frame=requestAnimationFrame(update);
    };
    frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);
  },[active,path]);
  return <g ref={ref} className="traffic-pattern-guide" aria-hidden>
    <path data-pattern-line="" d={path.d} className="traffic-pattern-line" vectorEffect="non-scaling-stroke" />
    <path d={path.finalD} className="traffic-final-line" vectorEffect="non-scaling-stroke" />
    {path.labels.map(l=><text key={l.label} className="traffic-leg-label" visibility="hidden">{l.label}</text>)}
  </g>;
}