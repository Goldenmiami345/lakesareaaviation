// Visual-editor controls for the fleet and course lists: "+ Add" tiles and Hide / Bring back
// buttons. They render nothing for visitors, and the forms load only when an admin opens one.
import { lazy, Suspense, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { setHidden, type CatalogKind } from "@/lib/catalog";
import { editStore, useEditState } from "@/lib/edit-store";
import { useCatalog } from "@/lib/use-catalog";

const Forms = lazy(() => import("./catalog-forms").then(m => ({ default: m.EditorAddForm })));
const NOUN: Record<CatalogKind, string> = { fleet: "airplane", programs: "training program", courses: "course" };

/** Hide (or bring back) one plane, program or course. Hidden things stay saved and come back in one click. */
export function HideToggle({ kind, id, hidden, className = "" }: { kind: CatalogKind; id: string; hidden: boolean; className?: string }) {
  const edit = useEditState();
  const { catalog } = useCatalog();
  if (!edit.on) return null;
  return <button type="button" data-catalog-control onClick={e => { e.preventDefault(); e.stopPropagation(); editStore.setCatalog(setHidden(catalog, kind, id, !hidden)); }}
    className={`catalog-control relative z-20 inline-flex min-h-9 items-center gap-1.5 bg-ink px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-background shadow-lg hover:bg-primary hover:text-primary-foreground ${className}`}>
    {hidden ? <><Eye className="size-3.5" /> Hidden · bring back</> : <><EyeOff className="size-3.5" /> Hide {NOUN[kind]}</>}
  </button>;
}

/** "+ Add airplane / program / course" tile, shown only in the visual editor. */
export function AddTile({ kind, className = "" }: { kind: CatalogKind; className?: string }) {
  const edit = useEditState();
  const [open, setOpen] = useState(false);
  if (!edit.on) return null;
  return <>
    <button type="button" data-catalog-control onClick={() => setOpen(true)} className={`catalog-add flex min-h-32 flex-col items-center justify-center gap-2 border-2 border-dashed border-primary bg-background/60 p-6 text-sm font-bold uppercase tracking-[0.1em] text-primary-text hover:bg-secondary ${className}`}>
      <Plus className="size-6" /> Add {NOUN[kind]}
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="z-[230] w-full overflow-y-auto sm:max-w-xl" data-catalog-control>
        <SheetHeader><SheetTitle>Add {NOUN[kind]}</SheetTitle></SheetHeader>
        <p className="mt-1 text-sm text-muted-foreground">It appears on the page right away for you. Visitors see it after you Publish, and History can undo it.</p>
        <div className="mt-5">{open && <Suspense fallback={<p className="text-sm">Loading…</p>}><Forms kind={kind} onDone={() => setOpen(false)} /></Suspense>}</div>
      </SheetContent>
    </Sheet>
  </>;
}

/** Wraps an item so the editor can dim it when hidden. Visitors never get hidden items at all. */
export const hiddenAttr = (hidden: boolean) => (hidden ? { "data-catalog-hidden": "" } : {});
