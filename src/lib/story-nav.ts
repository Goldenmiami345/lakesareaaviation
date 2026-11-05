export type MobileJourneyMode = "scroll" | "story";
export const parseMobileJourneyMode = (v: unknown): MobileJourneyMode => (v === "story" ? "story" : "scroll");
/** Story-mode stage step: returns the next index, or "exit" when moving forward past the last stage. */
export function storyStep(active: number, count: number, dir: 1 | -1): number | "exit" {
  if (dir === 1) return active >= count - 1 ? "exit" : active + 1;
  return Math.max(0, active - 1);
}
