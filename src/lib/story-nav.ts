export type MobileJourneyMode = "scroll" | "story";
export const STORY_SWIPE_HINT_MS = 1000;
export const STORY_TAP_HINT_MS = 1000;
export const STORY_HINT_TOTAL_MS = STORY_SWIPE_HINT_MS + STORY_TAP_HINT_MS;
export const parseMobileJourneyMode = (v: unknown): MobileJourneyMode => (v === "story" ? "story" : "scroll");
/** Story-mode stage step: returns the next index, or "exit" when moving forward past the last stage. */
export function storyStep(active: number, count: number, dir: 1 | -1): number | "exit" {
  if (dir === 1) return active >= count - 1 ? "exit" : active + 1;
  return Math.max(0, active - 1);
}
