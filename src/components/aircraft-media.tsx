import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aircraftModelUrl } from '../lib/aircraft-models';

const AircraftModel = lazy(() => import('./aircraft-model'));
/** A stable photo slot. Available models hydrate only once this slot is opened/visible. */
export function AircraftMedia({ reg, photo, hint = false, preview = false }: { reg: string; photo: string; hint?: boolean; preview?: boolean }) {
  const model = aircraftModelUrl(reg, preview);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[]);
  useEffect(() => {
    if (!model || !ref.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } },{rootMargin:'300px'});
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [model]);
  return <div ref={ref} data-aircraft-media="" data-model-gesture="" className="relative h-full w-full touch-none overflow-hidden"
    onPointerDown={e => { e.stopPropagation(); }}
    onPointerMove={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <img src={photo} alt={`${reg}, the real airplane`} className={`absolute inset-0 h-full w-full object-contain ${loaded ? 'invisible' : ''}`} />
    {model && visible && <Suspense fallback={null}><AircraftModel src={model} label={reg} poster={photo} autoRotate onLoad={() => setLoaded(true)} /></Suspense>}
  </div>;
}