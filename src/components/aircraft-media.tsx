import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aircraftModelUrl } from '../lib/aircraft-models';

const AircraftModel = lazy(() => import('./aircraft-model'));

// Model-viewer parsing is heavy main-thread work: wait for an idle page (or 1.5s after
// load, whichever is first), then start one model at a time in reveal order.
let idle: Promise<void> | null = null;
function pageIdle() {
  if (idle) return idle;
  idle = new Promise<void>(resolve => {
    const afterLoad = () => {
      let done = false; const go = () => { if (!done) { done = true; resolve(); } };
      window.setTimeout(go, 1500);
      (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback?.(go, { timeout: 1500 });
    };
    if (document.readyState === 'complete') afterLoad(); else window.addEventListener('load', afterLoad, { once: true });
  });
  return idle;
}
let chain: Promise<void> = Promise.resolve();
/** Queue a model start; the returned release() lets the next model begin. */
function queueModel(start: () => void) {
  let release!: () => void;
  const finished = new Promise<void>(r => { release = r; });
  chain = chain.then(() => pageIdle()).then(() => { start(); return Promise.race([finished, new Promise<void>(r => window.setTimeout(r, 8000))]); });
  return () => release();
}
/** A stable photo slot. Available models hydrate only once this slot is opened/visible. */
export function AircraftMedia({ reg, photo, preview = false }: { reg: string; photo: string; preview?: boolean }) {
  const model = aircraftModelUrl(reg, preview);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const release = useRef<() => void>(() => {});
  useEffect(() => {
    const el=ref.current;if(!el)return;
    const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[]);
  useEffect(() => {
    if (!model || !ref.current) return;
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.intersectionRatio >= 0.5)) return;
      observer.disconnect();
      release.current = queueModel(() => { if (!cancelled) setVisible(true); else release.current(); });
    }, { threshold: 0.5 });
    observer.observe(ref.current);
    return () => { cancelled = true; observer.disconnect(); release.current(); };
  }, [model]);
  return <div ref={ref} data-aircraft-media="" data-model-gesture="" className="relative h-full w-full touch-none overflow-hidden"
    onPointerDown={e => { e.stopPropagation(); }}
    onPointerMove={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <img src={photo} alt={`${reg}, the real airplane`} className={`absolute inset-0 h-full w-full object-contain ${loaded ? 'invisible' : ''}`} />
    {model && visible && <Suspense fallback={null}><AircraftModel src={model} label={reg} poster={photo} autoRotate onLoad={() => { setLoaded(true); release.current(); }} /></Suspense>}
  </div>;
}