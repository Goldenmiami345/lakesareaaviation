import { useSiteContent } from "@/lib/use-site-content";
/** Text from an editable content slot (original wording until saved edits load). */
export function SlotText({ k }: { k: string }) { return <>{useSiteContent().get(k)}</>; }
