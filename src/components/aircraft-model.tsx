import { createElement, useEffect, useState } from 'react';

export default function AircraftModel({ src, label, poster, autoRotate = false }: { src: string; label: string; poster?: string; autoRotate?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; void import('@google/model-viewer').then(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  return ready ? createElement('model-viewer', { src, alt: label, poster, 'camera-controls': true, 'touch-action': 'none', 'camera-orbit': '35deg 75deg auto', 'auto-rotate': autoRotate || undefined, 'rotation-per-second': '12deg', 'shadow-intensity': '0.5', 'interaction-prompt': 'none', className: 'relative h-full w-full' }) : null;
}