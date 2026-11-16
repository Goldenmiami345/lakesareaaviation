// Shared admin layout classes so every list row behaves the same on phones: the name gets the
// full width and its buttons sit underneath as large, even tap targets; from tablet width up the
// buttons move back beside the name.
export const ROW = "grid gap-3 sm:flex sm:items-center sm:justify-between";
export const ROW_ACTIONS = "grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end";
/** Phone-size tap target for small buttons; desktop keeps the compact size. */
export const ROW_BTN = "h-11 w-full text-sm sm:h-8 sm:w-auto sm:text-xs";
/** Save/Discard row that stays pinned to the bottom of a phone screen while there are unsaved changes. */
export const STICKY_SAVE = "sticky bottom-0 z-20 -mx-4 border-t border-border bg-background px-4 py-3 shadow-[0_-8px_24px_-12px_oklch(0_0_0/0.25)] md:static md:mx-0 md:border-0 md:p-0 md:shadow-none";
