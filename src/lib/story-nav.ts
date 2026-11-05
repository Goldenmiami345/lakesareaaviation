export type MobileJourneyMode = "scroll" | "story";
export const parseMobileJourneyMode = (v: unknown): MobileJourneyMode => (v === "story" ? "story" : "scroll");
/** A gesture may reach one section boundary; only a fresh gesture there may cross it. */
export function storySwipeLimit(start: number, base: number, height: number): number | null {
  if (start < base - 2) return base;
  if (start < base + height - 2) return base + height;
  return null;
}

export function boundedStoryScroll(target: number, limit: number | null): number {
  return Math.max(0, limit === null ? target : Math.min(target, limit));
}
/** Story-mode stage step: returns the next index, or "exit" when moving forward past the last stage. */
export function storyStep(active: number, count: number, dir: 1 | -1): number | "exit" {
  if (dir === 1) return active >= count - 1 ? "exit" : active + 1;
  return Math.max(0, active - 1);
}
