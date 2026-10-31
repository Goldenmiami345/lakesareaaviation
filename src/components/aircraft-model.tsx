import { createElement, useEffect, useRef, useState } from 'react';
import { MODEL_SETTINGS } from '../lib/model-settings';

export default function AircraftModel({ src, label, poster, autoRotate = true, onLoad }: { src: string; label: string; poster?: string; autoRotate?: boolean; onLoad?: () => void }) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el=ref.current;if(!ready||!el)return;
    const loaded=()=>{el.dataset['modelLoaded']='true';onLoad?.();};
    el.addEventListener('load',loaded);
    return()=>el.removeEventListener('load',loaded);
  },[ready,onLoad]);
  useEffect(() => { let alive = true; void import('@google/model-viewer').then(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  return ready ? createElement('model-viewer', { ...MODEL_SETTINGS, ref, src, alt: label, poster, 'auto-rotate': autoRotate || undefined, className: 'aircraft-model relative h-full w-full' }) : null;
}