import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aircraftModelUrl, hasAircraftModel } from '../lib/aircraft-models';
import { loadShow3DModels, useShow3DModelsState } from '../lib/use-site-settings';

const loadModelModule = () => import('./aircraft-model');
const AircraftModel = lazy(loadModelModule);

/** When the visitor 3D switch is on, start the viewer and decode these airplanes' models
 * after the page is idle, so tapping an airplane shows its 3D model straight away. */
export function warmAircraftModels(regs: readonly string[]) {
  if (import.meta.env.SSR) return;
  const urls = regs.map(r => aircraftModelUrl(r, true)).filter((u): u is string => !!u);
  if (!urls.length) return;
  void loadShow3DModels().then(on => {
    if (!on) return;
    return pageIdle().then(loadModelModule).then(m => m.warmModels(urls));
  }).catch(() => {});
}

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
  let release: () => void = () => {};
  const finished = new Promise<void>(r => { release = r; });
  chain = chain.then(() => pageIdle()).then(() => { start(); return Promise.race([finished, new Promise<void>(r => window.setTimeout(r, 8000))]); });
  return () => release();
}
/** A stable photo slot. Available models hydrate only once this slot is opened/visible.
 * `priority` (airplane info cards): the visitor asked for this airplane, so its model
 * starts at once instead of waiting for page idle and the one-at-a-time queue. */
export function AircraftMedia({ reg, photo, priority = false }: { reg: string; photo: string; priority?: boolean }) {
  const setting = useShow3DModelsState();
  const modeled = hasAircraftModel(reg);
  const [failed, setFailed] = useState(false);
  const model = failed ? null : aircraftModelUrl(reg, setting === true);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const release = useRef<() => void>(() => {});
  useEffect(() => {
    const el=ref.current;if(!model||!el)return;
    const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();};
    el.addEventListener('wheel',wheel,{passive:false});
    return()=>el.removeEventListener('wheel',wheel);
  },[model]);
  useEffect(() => {
    if (!model || !ref.current) return;
    if (priority) { setVisible(true); return; }
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.intersectionRatio >= 0.5)) return;
      observer.disconnect();
      release.current = queueModel(() => { if (!cancelled) setVisible(true); else release.current(); });
    }, { threshold: 0.5 });
    observer.observe(ref.current);
    return () => { cancelled = true; observer.disconnect(); release.current(); };
  }, [model, priority]);
  // A model that never arrives (no WebGL, blocked download) falls back to the photo.
  useEffect(() => {
    if (!model || !visible || loaded) return;
    const t = window.setTimeout(() => setFailed(true), 15000);
    return () => window.clearTimeout(t);
  }, [model, visible, loaded]);
  const photoOnly = <div data-aircraft-media="" className="relative h-full w-full overflow-hidden"><img src={photo} alt={`${reg}, the real airplane`} className="h-full w-full object-contain" /></div>;
  // 3D on: the model is the only thing shown, never the photo first. While the switch is
  // still loading, a modeled airplane's slot stays empty rather than flashing the photo.
  if (modeled && setting === null && !failed) return <div data-aircraft-media="" className="relative h-full w-full" />;
  if (!model) return photoOnly;
  return <div ref={ref} data-aircraft-media="" data-model-gesture="" className="relative h-full w-full touch-none overflow-hidden"
    onPointerDown={e => { e.stopPropagation(); }}
    onPointerMove={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    {!loaded && <span aria-hidden className="pointer-events-none absolute inset-x-[30%] bottom-3 h-0.5 animate-pulse rounded-full bg-current opacity-20" />}
    {visible && <Suspense fallback={null}><AircraftModel src={model} label={reg} autoRotate onLoad={() => { setLoaded(true); release.current(); }} onError={() => { setFailed(true); release.current(); }} /></Suspense>}
    {priority && loaded && <span aria-hidden className="pointer-events-none absolute bottom-0.5 right-1 font-mono text-[10px] uppercase tracking-[0.14em] text-background/55">Drag to turn</span>}
  </div>;
}
