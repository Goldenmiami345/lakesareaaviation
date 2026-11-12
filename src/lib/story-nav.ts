export type MobileJourneyMode = "scroll" | "story";
export const STORY_SWIPE_HINT_MS = 1000;
export const STORY_TAP_HINT_MS = 1000;
export const STORY_HINT_TOTAL_MS = STORY_SWIPE_HINT_MS + STORY_TAP_HINT_MS;
export const parseMobileJourneyMode = (v: unknown): MobileJourneyMode => (v === "story" ? "story" : "scroll");
/** Story-mode stage step: next index, "exit" forward past the last stage, "back" backward before the first. */
export function storyStep(active: number, count: number, dir: 1 | -1): number | "exit" | "back" {
  if (dir === 1) return active >= count - 1 ? "exit" : active + 1;
  return active <= 0 ? "back" : active - 1;
}
/** Largest fraction of a cube turn the swipe hint shows (0.12 of a turn = about 11 degrees). */
export const STORY_PEEK_TURN = 0.12;
/**
 * Swipe hint "peek": how far the real page is turned toward the next one at t (0..1 of the swipe cue).
 * Rests briefly, eases out in time with the chevrons, then eases back to exactly flat before the cue ends.
 */
export function storyPeek(t: number): number {
  if (!(t > 0.15 && t < 0.9)) return 0;
  const u = (t - 0.15) / 0.75;
  return STORY_PEEK_TURN * Math.sin(Math.PI * u) ** 2;
}
