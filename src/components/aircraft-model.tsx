import { createElement, useEffect, useState } from 'react';
import { MODEL_SETTINGS } from '../lib/model-settings';

export default function AircraftModel({ src, label, poster, autoRotate = true, onLoad }: { src: string; label: string; poster?: string; autoRotate?: boolean; onLoad?: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; void import('@google/model-viewer').then(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  return ready ? createElement('model-viewer', { ...MODEL_SETTINGS, src, alt: label, poster, 'auto-rotate': autoRotate || undefined, onLoad, className: 'aircraft-model relative h-full w-full' }) : null;
}