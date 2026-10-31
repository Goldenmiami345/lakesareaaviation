import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aircraftModelUrl } from '../lib/aircraft-models';

const AircraftModel = lazy(() => import('./aircraft-model'));
/** A stable photo slot. Available models hydrate only once this slot is opened/visible. */
export function AircraftMedia({ reg, photo, hint = false }: { reg: string; photo: string; hint?: boolean }) {
  const model = aircraftModelUrl(reg);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[]);
  useEffect(() => {
    if (!model || !ref.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [model]);
  return <div ref={ref} data-aircraft-media="" data-model-gesture="" className="relative h-full w-full touch-none overflow-hidden"
    onPointerDown={e => { e.stopPropagation(); setInteracted(true); }}
    onPointerMove={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <img src={photo} alt={`${reg}, the real airplane`} className="absolute inset-0 h-full w-full object-contain" />
    {model && visible && <Suspense fallback={null}><AircraftModel src={model} label={reg} poster={photo} autoRotate /></Suspense>}
    {model && hint && <span className={`pointer-events-none absolute bottom-2 inset-x-0 text-center text-xs text-muted-foreground transition-opacity ${interacted?'opacity-0':'opacity-100'}`}>Drag to rotate</span>}
  </div>;
}