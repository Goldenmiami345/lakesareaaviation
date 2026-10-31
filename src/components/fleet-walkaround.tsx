import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import type { WalkaroundPhoto } from '../lib/fleet-walkarounds';

export function FleetWalkaround({ photos, reg, onOpen }: { photos: WalkaroundPhoto[]; reg: string; onOpen: (index: number, button: HTMLButtonElement) => void }) {
  const [index, setIndex] = useState(0);
  const drag = useRef<{ x: number; index: number } | null>(null);
  const moved = useRef(false);
  const photo = photos[index];
  if (!photo) return null;
  const step = (n: number) => setIndex(i => (i + n + photos.length) % photos.length);
  return <div className="border-t border-border px-4 py-3">
    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase">Walk around</span><span className="font-mono text-xs text-muted-foreground">{index + 1} / {photos.length}</span></div>
    <div className="relative aspect-[4/3] touch-pan-y overflow-hidden"
      onPointerDown={e => { drag.current = { x: e.clientX, index }; moved.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (!d) return; const delta = e.clientX - d.x; if (Math.abs(delta) > 24) { moved.current = true; setIndex((d.index + Math.round(-delta / 55) + photos.length * 20) % photos.length); } }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img src={photo.small} srcSet={`${photo.small} 800w, ${photo.src} 1600w`} sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" alt={photo.label} loading="lazy" draggable={false} className="h-full w-full select-none object-contain" />
      <Button variant="secondary" size="icon" aria-label={`Open ${reg} walk-around photo fullscreen`} onClick={e => { if (!moved.current) onOpen(index, e.currentTarget); }} className="absolute bottom-2 right-2 size-11"><Maximize className="size-4" /></Button>
    </div>
    <div className="mt-2 flex items-center justify-between"><Button variant="ghost" size="icon" aria-label={`${reg} previous angle`} onClick={() => step(-1)}><ChevronLeft /></Button><Button variant="ghost" onClick={e => onOpen(index, e.currentTarget)} aria-label={`Open ${reg} current photo`}>View photo</Button><Button variant="ghost" size="icon" aria-label={`${reg} next angle`} onClick={() => step(1)}><ChevronRight /></Button></div>
  </div>;
}