import { createElement, useEffect, useRef, useState } from 'react';
import { MODEL_SETTINGS, MODEL_RESUME_MS } from '../lib/model-settings';

export default function AircraftModel({ src, label, poster, autoRotate = true, onLoad }: { src: string; label: string; poster?: string; autoRotate?: boolean; onLoad?: () => void }) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el=ref.current;if(!ready||!el)return;
    let resumeTimer=0, down=false, lastTap=0;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loaded=()=>{el.dataset['modelLoaded']='true';onLoad?.();};
    el.addEventListener('load',loaded);
    const pause=()=>{window.clearTimeout(resumeTimer);el.removeAttribute('auto-rotate');};
    const resume=()=>{window.clearTimeout(resumeTimer);if(autoRotate&&!reduce&&!down)resumeTimer=window.setTimeout(()=>el.setAttribute('auto-rotate',''),MODEL_RESUME_MS);};
    const start=()=>{down=true;pause();};
    const end=()=>{down=false;resume();};
    const change=(e:Event)=>{if((e as CustomEvent<{source:string}>).detail?.source==='user-interaction'){pause();resume();}};
    const reset=()=>{el.setAttribute('camera-orbit',MODEL_SETTINGS['camera-orbit']);el.setAttribute('field-of-view',MODEL_SETTINGS['field-of-view']);(el as HTMLElement & {resetTurntableRotation?:()=>void}).resetTurntableRotation?.();pause();resume();};
    const tap=(e:PointerEvent)=>{if(e.pointerType==='mouse')return;const now=performance.now();if(now-lastTap<300)reset();lastTap=now;};
    if(reduce)pause();
    el.addEventListener('pointerdown',start);el.addEventListener('pointerup',tap);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
    el.addEventListener('camera-change',change);el.addEventListener('dblclick',reset);
    return()=>{window.clearTimeout(resumeTimer);el.removeEventListener('load',loaded);el.removeEventListener('pointerdown',start);el.removeEventListener('pointerup',tap);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);el.removeEventListener('camera-change',change);el.removeEventListener('dblclick',reset);};
  },[ready,onLoad,autoRotate]);
  useEffect(() => {
    // The SSR guard removes model-viewer from the server bundle entirely. Without it the
    // production bundler merged model-viewer (top-level `class extends HTMLElement`) into a
    // shared chunk with the `performance` polyfill used by the site layout, so every
    // SiteShell page threw "HTMLElement is not defined" during server rendering.
    if (import.meta.env.SSR) return;
    let alive = true;
    void import('@google/model-viewer').then(() => { if (alive) setReady(true); }).catch(()=>undefined);
    return () => { alive = false; };
  }, []);
  return ready ? createElement('model-viewer', { ...MODEL_SETTINGS, ref, src, alt: label, poster, 'auto-rotate': autoRotate || undefined, className: 'aircraft-model relative h-full w-full' }) : null;
}