import { createElement, useEffect, useState } from 'react';

export default function AircraftModel({ src, label }: { src: string; label: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; void import('@google/model-viewer').then(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, []);
  return ready ? createElement('model-viewer', { src, alt: label, 'camera-controls': true, 'touch-action': 'none', className: 'h-full w-full' }) : null;
}