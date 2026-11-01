import { createElement, useEffect, useRef, useState } from 'react';
import { MODEL_SETTINGS } from '../lib/model-settings';

export default function AircraftModel({ src, label, poster, autoRotate = true, onLoad }: { src: string; label: string; poster?: string; autoRotate?: boolean; onLoad?: () => void }) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el=ref.current;if(!ready||!el)return;
    const loaded=()=>{el.dataset['modelLoaded']='true';onLoad?.();};
    el.addEventListener('load',loaded);
    // Pause the slow card spin while hovered or touched; resume on leave.
    const pause=()=>{if(autoRotate)el.removeAttribute('auto-rotate');};
    const resume=()=>{if(autoRotate)el.setAttribute('auto-rotate','');};
    el.addEventListener('pointerenter',pause);el.addEventListener('pointerdown',pause);el.addEventListener('pointerleave',resume);
    return()=>{el.removeEventListener('load',loaded);el.removeEventListener('pointerenter',pause);el.removeEventListener('pointerdown',pause);el.removeEventListener('pointerleave',resume);};
  },[ready,onLoad,autoRotate]);
  useEffect(() => {
    // The SSR guard removes model-viewer from the server bundle entirely. Without it the
    // production bundler merged model-viewer (top-level `class extends HTMLElement`) into a
    // shared chunk with the `performance` polyfill used by the site layout, so every
    // SiteShell page threw "HTMLElement is not defined" during server rendering.
    if (import.meta.env.SSR) return;
    let alive = true;
    void import('@google/model-viewer').then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return ready ? createElement('model-viewer', { ...MODEL_SETTINGS, ref, src, alt: label, poster, 'auto-rotate': autoRotate || undefined, className: 'aircraft-model relative h-full w-full' }) : null;
}