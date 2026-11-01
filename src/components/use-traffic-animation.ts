import { useEffect, type RefObject } from 'react';
import { CALL_DURATION_MS, MAX_CALLS } from '../lib/traffic-flight';
import { TrafficSchedule } from '../lib/traffic-sequence';
import { positionReport, type PatternAirport, type PatternSample, type Wind } from '../lib/traffic-pattern';
import { fitTagSide, tagSideHolds, tagBounds, setTagPosition, placeCard, radarAltitude, writeCard } from './traffic-ui';

type Projection = {x:number;y:number;transform:string;shadow:string;lift:number};
type Options = {
  active:boolean; airport:PatternAirport; wind:Wind|null; runwayHeading:number;
  regs:readonly string[]; svgRef:RefObject<SVGSVGElement|null>;
  planeRefs:RefObject<(SVGGElement|null)[]>; shadowRefs:RefObject<(SVGGElement|null)[]>;
  tagRefs:RefObject<(SVGGElement|null)[]>; textRefs:RefObject<(SVGTextElement|null)[]>;
  cardRef:RefObject<HTMLDivElement|null>; selectedRef:RefObject<number|null>;
  project:(s:PatternSample,reg:string)=>Projection; offsets?:readonly number[];
};
export function useTrafficAnimation(o:Options) {
  const {active,airport,wind,runwayHeading,regs,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets}=o;
  useEffect(()=>{
    if(!active)return;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Runway-sequenced laps: downwinds extend so only one airplane is ever on the runway.
    const schedule=new TrafficSchedule(airport,regs,wind,runwayHeading,offsets);
    const prev:(string|null)[]=regs.map(()=>null);
    const calls=new Map<number,number>();
    const origin=performance.now();let raf=0;
    const sample=(i:number,t:number)=>schedule.sample(i,t);
    const screen=(p:Projection,m:DOMMatrix)=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});
    const draw=(now:number)=>{
      const secs=reduce?0:(now-origin)/1000;
      const m=svgRef.current?.getScreenCTM();
      const states=regs.map((reg,i)=>{const s=sample(i,secs);return s?{s,p:project(s,reg)}:null;});
      for(const [i,end] of calls){if(now>=end){calls.delete(i);tagRefs.current[i]?.classList.remove('is-calling','is-pinging');}}
      states.forEach((state,i)=>{
        if(!state)return;const {s,p}=state;
        const plane=planeRefs.current[i];
        plane?.setAttribute('transform',p.transform);
        plane?.setAttribute('data-ground-speed',String(s.knots));plane?.setAttribute('data-msl',String(s.msl));plane?.setAttribute('data-phase',s.phase);
        shadowRefs.current[i]?.setAttribute('transform',p.shadow);
        shadowRefs.current[i]?.setAttribute('opacity',String(.4-p.lift*.28));
        const tag=tagRefs.current[i];setTagPosition(tag,m,p.x,p.y);
        if(m&&tag){
          const current=screen(p,m),k=Math.hypot(m.a,m.b)||1;
          tag.querySelectorAll('.traffic-history circle').forEach((dot,j)=>{
            const old=sample(i,secs-(j+1)*1.2);if(!old)return;const q=project(old,regs[i]??'');
            dot.setAttribute('cx',String((q.x-p.x)*k));dot.setAttribute('cy',String((q.y-p.y)*k));
          });
          const inScreen=current.x>=0&&current.x<=innerWidth&&current.y>=0&&current.y<=innerHeight;
          tag.style.visibility=inScreen?'visible':'hidden';
          const tx=textRefs.current[i];
          const data=tx?.querySelector('.traffic-call-data');if(data)data.textContent=`${radarAltitude(s.msl)} · ${s.knots}`;
          const phaseChanged=prev[i]!==null&&prev[i]!==s.phase;
          const report=positionReport(s.phase,airport.runway,airport.side);
          if(phaseChanged&&!reduce&&report){
            // Ping on EVERY leg entry; data is admitted only when its complete
            // 3.5s screen path is clear of UI and the other admitted block.
            tag.classList.remove('is-pinging');void tag.getBoundingClientRect();tag.classList.add('is-pinging');
            const title=tx?.querySelector('.traffic-call-title');if(title)title.textContent=`${regs[i]} · ${report.toUpperCase()}`;
            // Project the closest runway point through the same camera as the plane.
            // This prefers the outside of each turn in both aerial and oblique views.
            const dx=airport.end.x-airport.threshold.x,dy=airport.end.y-airport.threshold.y;
            const along=Math.max(0,Math.min(1,((s.x-airport.threshold.x)*dx+(s.y-airport.threshold.y)*dy)/(dx*dx+dy*dy||1)));
            const runway=screen(project({...s,x:airport.threshold.x+along*dx,y:airport.threshold.y+along*dy},regs[i]??''),m);
            const outside={x:current.x-runway.x,y:current.y-runway.y};
            const ahead=Array.from({length:15},(_,j)=>{const s=sample(i,secs+j*.25);return s?screen(project(s,regs[i]??''),m):current;});
            const occupied=Array.from(calls.keys()).filter(j=>j!==i).flatMap(j=>Array.from({length:15},(_,n)=>{
              const s=sample(j,secs+n*.25);if(!s)return [];const q=screen(project(s,regs[j]??''),m);const b=tagBounds(tagRefs.current[j],q.x,q.y);return b?[b]:[];
            }).flat());
            if((calls.has(i)||calls.size<MAX_CALLS)&&fitTagSide(tag,ahead,occupied,outside)){
              calls.set(i,now+CALL_DURATION_MS);tag.classList.add('is-calling');
            }
          }
          if(calls.has(i)){
            const own=tagBounds(tag,current.x,current.y);
            const overlapsOther=own&&Array.from(calls.keys()).some(j=>{
              if(j===i)return false;const state=states[j];if(!state)return false;
              const q=screen(state.p,m),other=tagBounds(tagRefs.current[j],q.x,q.y);
              return other&&own.l<other.r&&own.r>other.l&&own.t<other.b&&own.b>other.t;
            });
            const clear=tagSideHolds(tag,[current])&&!overlapsOther;
            // During pinch/pan UI relationships may change. Hide rather than
            // relocate a live block; targets and aircraft stay visible.
            tag.classList.toggle('call-obscured',!clear);
          }
          if(selectedRef.current===i){writeCard(cardRef.current,s);placeCard(cardRef.current,current.x,current.y,svgRef.current?.closest('section'));}
        }
        prev[i]=s.phase;
      });
      svgRef.current?.classList.toggle('has-call',calls.size>0);
      raf=requestAnimationFrame(draw); // reduced motion keeps static positions but still updates a newly opened card
    };
    raf=requestAnimationFrame(draw);
    const resize=()=>{if(reduce)draw(performance.now());};window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);tagRefs.current.forEach(g=>g?.classList.remove('is-calling','is-pinging','call-obscured'));};
  },[active,airport,wind,runwayHeading,regs,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets]);
}