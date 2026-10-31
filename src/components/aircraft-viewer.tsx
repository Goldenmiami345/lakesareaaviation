import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from './ui/button';
import type { fleet } from "../lib/site-data";

const AircraftModel = lazy(() => import('./aircraft-model'));
type Plane = (typeof fleet)[number];
export default function AircraftViewer({ plane, initialIndex = 0, onClose }: { plane: Plane; initialIndex?: number; onClose: () => void }) {
  const photos = plane.walkaround ?? [{ src: plane.image, small: plane.image, label: 'Exterior' }];
  const [index, setIndex] = useState(initialIndex);
  const [mode, setMode] = useState<'photos' | 'panel' | 'model'>('photos');
  const [model, setModel] = useState<string | null>(null);
  const zoom = useRef<ReactZoomPanPinchRef>(null);
  const photo = photos[index];
  const step = (d: number) => { setIndex(i => (i + d + photos.length) % photos.length); zoom.current?.resetTransform(0); };
  useEffect(() => {
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', key); };
  }, [onClose]);
  useEffect(() => {
    const controller = new AbortController();
    const url = `/models/${plane.registration.toLowerCase()}.glb`;
    // Check GLB magic bytes, not just 200: static hosts can return HTML for missing files.
    void fetch(url, { headers: { Range: 'bytes=0-3' }, signal: controller.signal }).then(async r => {
      if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) return;
      const reader = r.body?.getReader(); if (!reader) return;
      const { value } = await reader.read(); await reader.cancel();
      if (value && value.length >= 4 && String.fromCharCode(...value.slice(0, 4)) === 'glTF') setModel(url);
    }).catch(() => {});
    return () => controller.abort();
  }, [plane.registration]);
  return createPortal(<div role="dialog" aria-modal="true" aria-label={`${plane.registration} viewer`} className="fixed inset-0 z-[80] flex flex-col bg-ink text-background">
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(.75rem,env(safe-area-inset-top))]">
      <div><p className="font-mono text-xs">{plane.registration}{plane.nickname ? ` · “${plane.nickname}”` : ''}</p><p className="font-display text-lg">{plane.name}</p></div>
      <Button variant="ghost" size="icon" aria-label="Close viewer" autoFocus onClick={onClose} className="size-11"><X /></Button>
    </div>
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {mode === 'model' && model ? <Suspense fallback={null}><AircraftModel src={model} label={plane.name} /></Suspense> :
        <TransformWrapper ref={zoom} minScale={1} maxScale={4} centerOnInit wheel={{ step: .1 }}>
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
            <img src={mode === 'panel' ? plane.panel : photo?.src} alt={mode === 'panel' ? `${plane.registration} panel` : photo?.label} draggable={false} className="h-full w-full select-none object-contain" />
          </TransformComponent>
        </TransformWrapper>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-center gap-1">
        {photos.length > 1 && mode === 'photos' && <><Button variant="ghost" size="icon" aria-label="Previous photo" onClick={() => step(-1)}><ChevronLeft /></Button><span className="font-mono text-xs">{index + 1}/{photos.length}</span><Button variant="ghost" size="icon" aria-label="Next photo" onClick={() => step(1)}><ChevronRight /></Button></>}
        {mode !== 'model' && <><Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => zoom.current?.zoomOut()}><Minus /></Button><Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => zoom.current?.zoomIn()}><Plus /></Button><Button variant="ghost" size="icon" aria-label="Reset photo zoom" onClick={() => zoom.current?.resetTransform()}><RotateCcw /></Button></>}
      </div>
      <div className="flex gap-1">
        {(plane.panel || model) && <Button variant="ghost" aria-pressed={mode === 'photos'} onClick={() => setMode('photos')}>{plane.walkaround ? 'Walk around' : 'Exterior'}</Button>}
        {plane.panel && <Button variant="ghost" aria-pressed={mode === 'panel'} onClick={() => setMode('panel')}>Panel</Button>}
        {model && <Button variant="ghost" aria-pressed={mode === 'model'} onClick={() => setMode('model')}>3D</Button>}
      </div>
    </div>
  </div>, document.body);
}
