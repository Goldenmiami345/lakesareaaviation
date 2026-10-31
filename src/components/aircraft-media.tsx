import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aircraftModelUrl } from '../lib/aircraft-models';
import { Button } from './ui/button';

const AircraftModel = lazy(() => import('./aircraft-model'));
/** A stable photo slot. Available models hydrate only once this slot is opened/visible. */
export function AircraftMedia({ reg, photo, hint = false, preview = false }: { reg: string; photo: string; hint?: boolean; preview?: boolean }) {
  const model = aircraftModelUrl(reg, preview);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [opened, setOpened] = useState(!hint);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[]);
  useEffect(() => {
    if (!opened || !model || !ref.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [model, opened]);
  return <div ref={ref} data-aircraft-media="" data-model-gesture="" className="relative h-full w-full touch-none overflow-hidden"
    onPointerDown={e => { e.stopPropagation(); setInteracted(true); }}
    onPointerMove={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <img src={photo} alt={`${reg}, the real airplane`} className={`absolute inset-0 h-full w-full object-contain ${loaded ? 'invisible' : ''}`} />
    {model && visible && <Suspense fallback={null}><AircraftModel src={model} label={reg} poster={photo} autoRotate onLoad={() => setLoaded(true)} /></Suspense>}
    {model && hint && !opened && <Button variant="secondary" aria-label={`Open ${reg} 3D`} className="absolute bottom-3 right-3" onClick={() => {setOpened(true);setInteracted(false);}}>3D</Button>}
    {model && hint && opened && <span className={`pointer-events-none absolute bottom-2 inset-x-0 text-center text-xs text-muted-foreground transition-opacity ${interacted?'opacity-0':'opacity-100'}`}>Drag to rotate</span>}
  </div>;
}