import { useEffect, useMemo, useRef, useState } from 'react';
import { trafficPath } from '../lib/traffic-path';
import type { PatternAirport } from '../lib/traffic-pattern';
import type { TrafficPatternMode } from '../lib/use-site-settings';
import { placePatternLabel } from './traffic-ui';

/** Pulse timing: fade in every 6–8 s (random), hold ~3 s, 600 ms fades (CSS). */
export const PATTERN_PULSE = { minGapMs: 6000, maxGapMs: 8000, holdMs: 3000, fadeMs: 600 } as const;

export function TrafficPath({airport,active,mode,paused=false}:{airport:PatternAirport;active:boolean;mode:Exclude<TrafficPatternMode,'off'>;paused?:boolean}) {
  const path=useMemo(()=>trafficPath(airport),[airport]),ref=useRef<SVGGElement>(null);
  const [shown,setShown]=useState(mode==='always');
  useEffect(()=>{
    if(mode==='always'){setShown(true);return;}
    setShown(false);
    // Pulsing pauses while an info card is open; reduced motion never pulses.
    if(!active||paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let timer=0;
    const cycle=()=>{
      timer=window.setTimeout(()=>{
        setShown(true);
        timer=window.setTimeout(()=>{setShown(false);cycle();},PATTERN_PULSE.fadeMs+PATTERN_PULSE.holdMs);
      },PATTERN_PULSE.minGapMs+Math.random()*(PATTERN_PULSE.maxGapMs-PATTERN_PULSE.minGapMs));
    };
    cycle();
    return()=>window.clearTimeout(timer);
  },[mode,active,paused]);
  useEffect(()=>{
    if(!active||!shown)return;
    let frame=0,last=0;
    const update=(now:number)=>{
      if(now-last>120){last=now;const m=ref.current?.ownerSVGElement?.getScreenCTM();const occupied:DOMRect[]=[];
        ref.current?.querySelectorAll<SVGTextElement>('text').forEach((el,i)=>{const label=path.labels[i];if(m&&label)placePatternLabel(el,m,label,occupied);});
      }
      frame=requestAnimationFrame(update);
    };
    frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);
  },[active,path,shown]);
  return <g ref={ref} className="traffic-pattern-guide" data-shown={shown?'':undefined} data-mode={mode} aria-hidden>
    <path d={path.d} className="traffic-pattern-halo" vectorEffect="non-scaling-stroke" />
    <path d={path.finalD} className="traffic-pattern-halo" vectorEffect="non-scaling-stroke" />
    <path data-pattern-line="" d={path.d} className="traffic-pattern-line" vectorEffect="non-scaling-stroke" />
    <path d={path.finalD} className="traffic-final-line" vectorEffect="non-scaling-stroke" />
    {path.labels.map(l=><text key={l.label} className="traffic-leg-label" visibility="hidden">{l.label}</text>)}
  </g>;
}
