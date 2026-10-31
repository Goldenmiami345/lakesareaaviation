const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const JOURNEY_HOLD = 0.8;
export const JOURNEY_STAGE_SVH = 240;

// Each stage owns a reading window, then a transition; the final stage holds to the exit.
export function journeyFrame(progress: number, count: number) {
  const length = Math.max(1, count);
  const position = clamp(progress) * length;
  const stage = Math.min(length - 1, Math.floor(position));
  const local = clamp(position - stage);
  const linear = stage < length - 1 ? clamp((local - JOURNEY_HOLD) / (1 - JOURNEY_HOLD)) : 0;
  const transition = linear * linear * (3 - 2 * linear);
  return {
    stage,
    next: Math.min(length - 1, stage + 1),
    transition,
    active: transition < 0.5 ? stage : Math.min(length - 1, stage + 1),
    copyOpacity: Math.abs(1 - 2 * transition),
    progress: clamp(progress),
  };
}

export function journeyLanding(index: number, count: number) {
  const length = Math.max(1, count);
  return (clamp(index, 0, length - 1) + JOURNEY_HOLD / 2) / length;
}

// Index of the stage landing closest to the given progress — used to snap a
// momentum fling that stops between stages back onto one page.
export function journeyNearestLanding(progress: number, count: number) {
  const length = Math.max(1, count);
  const p = clamp(progress);
  let best = 0;
  for (let index = 1; index < length; index += 1) {
    if (Math.abs(journeyLanding(index, length) - p) < Math.abs(journeyLanding(best, length) - p)) best = index;
  }
  return best;
}

// Snap-stop position for a stage. The first page rests at the very top of the
// journey so visitors scroll naturally into it with no forced jump.
export function journeyStop(index: number, count: number) {
  return index <= 0 ? 0 : journeyLanding(index, count);
}

// ---- Custom paging (replaces native snap) ----
// A page is a resting scroll position. `hold` marks the end of a stretch that
// renders the same frame as `y` (the pinned tail after a journey's last stage),
// which paging skips instantly so no swipe is spent on dead length.
export type JourneyPage = { y: number; hold?: number };
export type PageSegment = { y: number; instant: boolean };

const TOL = 2;

export function currentPage(pages: JourneyPage[], y: number) {
  return pages.findIndex((p) => y >= p.y - TOL && y <= (p.hold ?? p.y) + TOL);
}

// Path for one swipe/notch in `dir` from scroll position `y`, or null when the
// move leaves the paged range (native scrolling takes over).
export function pageStep(pages: JourneyPage[], y: number, dir: 1 | -1): PageSegment[] | null {
  if (!pages.length) return null;
  const j = currentPage(pages, y);
  if (dir > 0) {
    if (j >= 0) {
      const next = pages[j + 1];
      if (!next) return null;
      const from = pages[j]!;
      const path: PageSegment[] = [];
      if (from.hold !== undefined && y < from.hold - TOL) path.push({ y: from.hold, instant: true });
      path.push({ y: next.y, instant: false });
      return path;
    }
    const next = pages.find((p) => p.y > y);
    return next ? [{ y: next.y, instant: false }] : null;
  }
  const prevIndex = j >= 0 ? j - 1 : pages.map((p) => (p.hold ?? p.y) < y).lastIndexOf(true);
  const prev = pages[prevIndex];
  if (!prev) return null;
  const path: PageSegment[] = [{ y: prev.hold ?? prev.y, instant: false }];
  if (prev.hold !== undefined) path.push({ y: prev.y, instant: true });
  return path;
}

export function nearestPage(pages: JourneyPage[], y: number) {
  let best = 0, dist = Infinity;
  pages.forEach((p, i) => {
    const d = y < p.y ? p.y - y : y > (p.hold ?? p.y) ? y - (p.hold ?? p.y) : 0;
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}
