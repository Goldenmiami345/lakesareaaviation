// Admin-only live preview: real site pages in a scaled frame, one tab per page the change
// touches, with the unsaved changes applied (see src/lib/site-preview.ts). Nothing is saved.
import { useEffect, useRef, useState } from "react";
import { Eye, Monitor, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PREVIEW_FRAME, sendPreview, type PreviewPage, type PreviewState } from "@/lib/site-preview";

const SIZE = { desktop: { w: 1280, h: 820 }, phone: { w: 390, h: 760 } } as const;

/** title: the frame's label (default: unsaved changes); onClose: called by the close button instead
 *  of collapsing back to the "Preview on the site" button (used for earlier versions). */
export function SitePreview({ pages, state, startOpen = false, title = "Preview · not live until you save", onClose }: { pages: PreviewPage[]; state: PreviewState; startOpen?: boolean; title?: string; onClose?: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const [at, setAt] = useState(0);
  const [device, setDevice] = useState<keyof typeof SIZE>("desktop");
  const [width, setWidth] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const json = JSON.stringify(state);
  const latest = useRef(state); latest.current = state;

  // Push every change to the open page (debounced a little while typing).
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => sendPreview(frame.current?.contentWindow, latest.current), 250);
    return () => window.clearTimeout(t);
  }, [open, json]);
  useEffect(() => {
    if (!open || !box.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [open]);

  if (!pages.length) return null;
  if (!open) return <Button type="button" variant="outline" className="h-11 w-full rounded-none sm:w-auto" onClick={() => { sendPreview(null, state); setOpen(true); }}>
    <Eye className="size-4" /> Preview on the site ({pages.length} page{pages.length === 1 ? "" : "s"})</Button>;

  const page = pages[Math.min(at, pages.length - 1)]!;
  const s = SIZE[device];
  const scale = width ? Math.min(1, width / s.w) : 0.5;
  const left = width ? Math.max(0, (width - s.w * scale) / 2) : 0;
  const tab = (on: boolean) => `inline-flex min-h-10 shrink-0 items-center gap-1.5 border px-3 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`;

  return <section aria-label={title} className="grid grid-cols-[minmax(0,1fr)] gap-3 border border-border bg-secondary p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em]">{title}</p>
      <span className="flex gap-1">
        <button type="button" aria-pressed={device === "desktop"} className={tab(device === "desktop")} onClick={() => setDevice("desktop")}><Monitor className="size-4" /> Computer</button>
        <button type="button" aria-pressed={device === "phone"} className={tab(device === "phone")} onClick={() => setDevice("phone")}><Smartphone className="size-4" /> Phone</button>
        <button type="button" aria-label="Close preview" className={tab(false)} onClick={() => (onClose ? onClose() : setOpen(false))}><X className="size-4" /></button>
      </span>
    </div>
    <div role="tablist" aria-label="Pages this change shows on" className="flex gap-1 overflow-x-auto pb-1">
      {pages.map((p, i) => <button key={p.path} type="button" role="tab" aria-selected={p.path === page.path} className={tab(p.path === page.path)} onClick={() => setAt(i)}>{p.label}</button>)}
    </div>
    <div ref={box} className="relative overflow-hidden border border-border bg-background" style={{ height: Math.round(s.h * scale) }}>
      <iframe ref={frame} key={`${page.path}|${device}`} name={PREVIEW_FRAME} src={page.path} title={`Preview of ${page.label}`}
        onLoad={() => sendPreview(frame.current?.contentWindow, latest.current)}
        className="absolute top-0 border-0" style={{ left, width: s.w, height: s.h, transform: `scale(${scale})`, transformOrigin: "top left" }} />
    </div>
    <p className="text-xs text-muted-foreground">You can scroll and click inside the preview. Only you can see it.</p>
  </section>;
}
