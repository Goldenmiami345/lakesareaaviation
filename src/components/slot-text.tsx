import { useEffect, useRef } from "react";
import { SLOT_BY_KEY } from "@/lib/content-slots";
import { editStore, useEditState } from "@/lib/edit-store";
import { useSiteContent } from "@/lib/use-site-content";

/** Text from an editable content slot. Published: plain text, no wrapper. Visual editor on:
 *  the same text becomes click-to-type in place (styles unchanged, only an outline is added). */
export function SlotText({ k }: { k: string }) {
  const site = useSiteContent();
  const edit = useEditState();
  if (!edit.on) return <>{site.get(k)}</>;
  return <EditableText k={k} value={site.get(k)} />;
}

function EditableText({ k, value }: { k: string; value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const slot = SLOT_BY_KEY.get(k);
  // Uncontrolled while typing (keeps the caret); outside updates (restore, discard) sync in.
  useEffect(() => { const el = ref.current; if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value; }, [value]);
  const published = () => editStore.get().base?.[k] ?? slot?.def ?? "";
  return <span ref={ref} data-slot-text={k} className="slot-edit" contentEditable="plaintext-only" suppressContentEditableWarning spellCheck
    role="textbox" aria-label={slot?.label ?? "Editable text"} aria-multiline={slot?.multiline ? true : undefined}
    onClickCapture={e => e.preventDefault()}
    onFocus={() => editStore.setFocus(k)}
    onBlur={e => { editStore.setFocus(null); if (!e.currentTarget.textContent?.trim()) { e.currentTarget.textContent = slot?.def ?? ""; editStore.setDraft(k, slot?.def ?? "", published()); } }}
    onKeyDown={e => { if (e.key === "Enter" && !slot?.multiline) e.preventDefault(); if (e.key === "Escape") e.currentTarget.blur(); }}
    onInput={e => editStore.setDraft(k, (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim(), published())}>{value}</span>;
}
