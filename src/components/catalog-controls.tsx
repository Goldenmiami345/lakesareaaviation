// Visual-editor controls for the fleet and course lists: "+ Add" tiles and Hide / Bring back
// buttons. They render nothing for visitors, and the forms load only when an admin opens one.
import { lazy, Suspense, useState } from "react";
import { Eye, EyeOff, PencilLine, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { editPlane, originalPlane, PLANE_LIMITS, setHidden, type CatalogKind, type Plane } from "@/lib/catalog";
import { EditableSpan } from "@/components/slot-text";
import { editStore, useEditState } from "@/lib/edit-store";
import { useCatalog } from "@/lib/use-catalog";

const Forms = lazy(() => import("./catalog-forms").then(m => ({ default: m.EditorAddForm })));
const PlaneEdit = lazy(() => import("./catalog-forms").then(m => ({ default: m.EditorPlaneForm })));
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

type PlaneField = "name" | "nickname" | "use" | "note";
const FIELD_LABEL: Record<PlaneField, string> = { name: "airplane", nickname: "nickname", use: "used for", note: "note" };
/** One airplane detail (name, nickname, "used for", note). Visitors get plain text; in the visual
 *  editor it is click-to-type and the change shows everywhere this airplane appears. */
export function PlaneText({ f, field }: { f: Plane; field: PlaneField }) {
  const edit = useEditState();
  const { catalog } = useCatalog();
  const value = f[field] ?? "";
  if (!edit.on) return <>{value}</>;
  const reg = f.registration;
  return <EditableSpan k={`plane.${reg}.${field}`} value={value} multiline={field === "note"}
    meta={{ label: `${reg} · ${FIELD_LABEL[field]}`, max: PLANE_LIMITS[field], def: value, hint: "Airplane detail · updates everywhere this airplane appears" }}
    onType={t => editStore.setCatalog(editPlane(catalog, reg, { [field]: t.slice(0, PLANE_LIMITS[field]) }))}
    onEmpty={() => {
      // Nickname and note may be left empty; name and "used for" go back to the original.
      if (field === "nickname" || field === "note") { editStore.setCatalog(editPlane(catalog, reg, { [field]: "" })); return ""; }
      const orig = originalPlane(catalog, reg)?.[field] ?? value;
      editStore.setCatalog(editPlane(catalog, reg, { [field]: orig })); return orig;
    }} />;
}

/** "Edit details & photos" for one airplane: specs, photos, type and price line in one panel. */
export function PlaneEditButton({ f, className = "", short = false }: { f: Plane; className?: string; short?: boolean }) {
  const edit = useEditState();
  const [open, setOpen] = useState(false);
  if (!edit.on) return null;
  return <>
    <button type="button" data-catalog-control aria-label={short ? "Edit details & photos" : undefined} onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      className={`catalog-control relative z-20 inline-flex min-h-9 items-center gap-1.5 bg-primary px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-lg hover:bg-ink hover:text-background ${className}`}>
      <PencilLine className="size-3.5" /> {short ? "Edit" : "Edit details & photos"}
    </button>
    {/* The panel renders in a portal, but React still bubbles its clicks to the card underneath
        (a phone tile is one big button), so they stop here. */}
    <span className="contents" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="z-[230] w-full overflow-y-auto sm:max-w-xl" data-catalog-control>
        <SheetHeader><SheetTitle>{f.registration}{f.nickname ? ` “${f.nickname}”` : ""}</SheetTitle></SheetHeader>
        <p className="mt-1 text-sm text-muted-foreground">Changes show on the page right away for you. Visitors see them after you Publish, and History can undo them.</p>
        <div className="mt-5">{open && <Suspense fallback={<p className="text-sm">Loading…</p>}><PlaneEdit reg={f.registration} onDone={() => setOpen(false)} /></Suspense>}</div>
      </SheetContent>
    </Sheet>
    </span>
  </>;
}

/** Editor buttons for an airplane card (hide + edit), stacked in one corner. Nothing for visitors. */
export function PlaneControls({ f, compact = false, className = "" }: { f: Plane & { hidden?: boolean }; compact?: boolean; className?: string }) {
  const edit = useEditState();
  if (!edit.on) return null;
  const small = compact ? "!min-h-8 !px-2 !text-[9px]" : "";
  return <div data-catalog-control className={`absolute z-20 flex flex-col items-start gap-1 ${className}`}>
    <HideToggle kind="fleet" id={f.registration} hidden={!!f.hidden} className={small} />
    <PlaneEditButton f={f} className={small} short={compact} />
  </div>;
}
