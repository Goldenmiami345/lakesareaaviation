import { useEffect, type RefObject } from 'react';
import { CALL_DURATION_MS, MAX_CALLS, makeFlightPlan, sampleFlight } from '../lib/traffic-flight';
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
    const plans=regs.map(reg=>makeFlightPlan(airport,reg,wind,runwayHeading));
    const starts=plans.map((plan,i)=>plan.seconds*(offsets?.[i]??(i/regs.length+.05)));
    const prev:(string|null)[]=regs.map(()=>null);
    const calls=new Map<number,number>();
    const origin=performance.now();let raf=0;
    const sample=(i:number,t:number)=>{const plan=plans[i];return plan ? sampleFlight(plan,t+(starts[i]??0)) : null;};
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
            // 2.5s screen path is clear of UI and the other admitted block.
            tag.classList.remove('is-pinging');void tag.getBoundingClientRect();tag.classList.add('is-pinging');
            const title=tx?.querySelector('.traffic-call-title');if(title)title.textContent=`${regs[i]} · ${report.toUpperCase()}`;
            const ahead=Array.from({length:11},(_,j)=>{const s=sample(i,secs+j*.25);return s?screen(project(s,regs[i]??''),m):current;});
            const occupied=Array.from(calls.keys()).filter(j=>j!==i).flatMap(j=>Array.from({length:11},(_,n)=>{
              const s=sample(j,secs+n*.25);if(!s)return [];const q=screen(project(s,regs[j]??''),m);const b=tagBounds(tagRefs.current[j],q.x,q.y);return b?[b]:[];
            }).flat());
            if((calls.has(i)||calls.size<MAX_CALLS)&&fitTagSide(tag,ahead,occupied)){
              calls.set(i,now+CALL_DURATION_MS);tag.classList.add('is-calling');
            }
          }
          if(calls.has(i)){
            const clear=tagSideHolds(tag,[current]);
            // During pinch/pan UI relationships may change. Hide rather than
            // relocate a live block; targets and aircraft stay visible.
            tag.classList.toggle('call-obscured',!clear);
          }
          if(selectedRef.current===i){placeCard(cardRef.current,current.x,current.y);writeCard(cardRef.current,s);}
        }
        prev[i]=s.phase;
      });
      if(!reduce)raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    const resize=()=>{if(reduce)draw(performance.now());};window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);tagRefs.current.forEach(g=>g?.classList.remove('is-calling','is-pinging','call-obscured'));};
  },[active,airport,wind,runwayHeading,regs,svgRef,planeRefs,shadowRefs,tagRefs,textRefs,cardRef,selectedRef,project,offsets]);
}