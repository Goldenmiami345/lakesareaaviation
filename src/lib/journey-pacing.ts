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

// ---- Section-scoped paging ----
// Pages carry the section (journey) they belong to. Forced one-swipe paging only
// moves between pages of the same section; entering or leaving a section is
// native free scrolling, so this returns null at every section edge.
export type SectionPage = { y: number; group: number };

export function sectionAt(pages: SectionPage[], y: number) {
  const groups = [...new Set(pages.map((p) => p.group))];
  for (const g of groups) {
    const ys = pages.filter((p) => p.group === g).map((p) => p.y);
    if (y >= Math.min(...ys) - TOL && y <= Math.max(...ys) + TOL) return g;
  }
  return -1;
}

export function sectionStep(pages: SectionPage[], y: number, dir: 1 | -1): number | null {
  // Upward movement is always free, native scrolling: it never pages.
  if (dir < 0) return null;
  const g = sectionAt(pages, y);
  if (g < 0) return null;
  const own = pages.filter((p) => p.group === g).map((p) => p.y).sort((a, b) => a - b);
  const on = own.findIndex((p) => Math.abs(p - y) <= TOL);
  if (on >= 0) return own[on + dir] ?? null;
  return (dir > 0 ? own.find((p) => p > y) : [...own].reverse().find((p) => p < y)) ?? null;
}

export function nearestSectionPage(pages: SectionPage[], y: number) {
  const g = sectionAt(pages, y);
  if (g < 0) return null;
  let best: number | null = null;
  for (const p of pages) if (p.group === g && (best === null || Math.abs(p.y - y) < Math.abs(best - y))) best = p.y;
  return best;
}

// ---- One gesture = one stop (downward) / stacked pages (upward) ----
// Stops are every journey stage plus each journey's exit (the next section's top).
export const STOP_TOL = 2;
export type JourneyMode = "fade" | "stack";

// First stop strictly below y (+tolerance), so a part-way position resolves to the next stop down.
export function nextStopDown(stops: number[], y: number): number | null {
  const sorted = [...stops].sort((a, b) => a - b);
  return sorted.find((s) => s > y + STOP_TOL) ?? null;
}

// Only fully pinned journeys may page, and only to another stage of that journey.
export function pinnedStepDown(stageStops: number[], y: number, pinnedStart: number, pinnedEnd: number) {
  if (y < pinnedStart || y > pinnedEnd) return null;
  return nextStopDown(stageStops, y);
}

// Journey scroll fraction (0..1) at each stage stop; the last stage rests at the end of the pinned stretch.
export function stageStopFraction(index: number, count: number) {
  const n = Math.max(1, count);
  if (index <= 0) return 0;
  if (index >= n - 1) return 1;
  return journeyLanding(index, n);
}

// Continuous stage position for stack mode: exactly k on stage k's stop, linear between stops.
export function stackProgress(fraction: number, count: number) {
  const n = Math.max(1, count);
  const f = clamp(fraction);
  if (n === 1) return 0;
  for (let k = 0; k < n - 1; k += 1) {
    const a = stageStopFraction(k, n), b = stageStopFraction(k + 1, n);
    if (f <= b) return k + (b > a ? (f - a) / (b - a) : 0);
  }
  return n - 1;
}

// Stage k's vertical offset in viewport heights: 0 = on screen, negative = stacked above.
export const stackOffset = (index: number, progress: number) => index - progress;

// Touchscreen stacks use one real viewport per stage, rather than stretching
// each viewport over the desktop reading corridor.
export function touchJourneyFraction(position: number, count: number) {
  const n = Math.max(1, count);
  const p = clamp(position, 0, n - 1);
  const k = Math.floor(p);
  const a = stageStopFraction(k, n);
  const b = stageStopFraction(Math.min(n - 1, k + 1), n);
  return a + (b - a) * (p - k);
}

// Crossfade and stack render identically only on a stop or outside a journey's pinned stretch.
export function isModeSwitchPoint(stageStops: number[], y: number) {
  if (!stageStops.length) return true;
  const first = stageStops[0]!, last = stageStops[stageStops.length - 1]!;
  if (y <= first + STOP_TOL || y >= last - STOP_TOL) return true;
  return stageStops.some((s) => Math.abs(s - y) <= STOP_TOL);
}

export function resolveMode(current: JourneyMode, wanted: JourneyMode, atSwitchPoint: boolean): JourneyMode {
  return atSwitchPoint ? wanted : current;
}

// Altitude readout: each stage rests on a round target (evenly spaced to `max`, whole
// thousands); the value only counts between targets while a stage transition is moving.
export function journeyStageAltitude(index: number, count: number, max = 35000) {
  const length = Math.max(1, count);
  return length < 2 ? 0 : Math.round((clamp(index, 0, length - 1) / (length - 1)) * max / 1000) * 1000;
}
export function journeyAltitude(frame: { stage: number; next: number; transition: number }, count: number, max = 35000) {
  const a = journeyStageAltitude(frame.stage, count, max), b = journeyStageAltitude(frame.next, count, max);
  return Math.round(a + (b - a) * frame.transition);
}

// ---- Glide timing ----
export const GLIDE_MS_TOUCH = 700;
export const GLIDE_MS_WHEEL = 800;
export const GLIDE_MS_SHORT = 400;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// A stage page is one viewport; only small edge corrections (< 1/3 viewport) use the short glide.
export function glideDuration(distance: number, viewportHeight: number, touch: boolean) {
  if (Math.abs(distance) < viewportHeight / 3) return GLIDE_MS_SHORT;
  return touch ? GLIDE_MS_TOUCH : GLIDE_MS_WHEEL;
}
// Scroll position at time `elapsed` of a glide: monotonic from `from` to `to`, exactly `to` at the end.
export function glideAt(from: number, to: number, elapsed: number, duration: number) {
  const t = clamp(elapsed / Math.max(1, duration));
  return t >= 1 ? to : from + (to - from) * easeInOutCubic(t);
}

// ---- Wheel gestures ----
// One gesture = wheel events until WHEEL_SILENCE_MS after the last one; a sign change starts a new
// gesture. A gesture pages at most once; events during a glide or shortly after it lands are dropped.
export const WHEEL_SILENCE_MS = 250;
export const WHEEL_AFTER_LAND_MS = 300;
export type WheelState = { lastAt: number; sign: number; used: boolean; landedAt: number; gliding: boolean };
export const newWheelState = (): WheelState => ({ lastAt: -Infinity, sign: 0, used: false, landedAt: -Infinity, gliding: false });
// Returns "page" when this event may start a page, "drop" when it must be swallowed, "native" otherwise.
export function wheelDecision(s: WheelState, now: number, deltaY: number, canPage: boolean): "page" | "drop" | "native" {
  const sign = Math.sign(deltaY);
  if (sign === 0) return "native";
  const fresh = now - s.lastAt > WHEEL_SILENCE_MS || sign !== s.sign;
  s.lastAt = now; s.sign = sign;
  if (fresh) s.used = false;
  if (sign < 0) return s.gliding ? "drop" : "native";
  if (s.gliding || now - s.landedAt < WHEEL_AFTER_LAND_MS) { s.used = true; return "drop"; }
  if (s.used) return "drop";
  if (!canPage) return "native";
  s.used = true;
  return "page";
}

// ---- Proximity snapping at section edges (after native momentum ends) ----
// Small window: only near-misses are finished, so visitors are never pulled into a section.
export const SNAP_WINDOW_VH = 0.2;
export const SNAP_MIN_DRAG = 40;
export type SnapZone = { first: number; last: number; end: number };
// Downward native scrolling that ends just short of a journey's first stage, or just short of the
// section after a journey, finishes the move; everywhere else native scrolling stays untouched.
export function snapTarget(zones: SnapZone[], y: number, startY: number, vh: number): number | null {
  if (y - startY < SNAP_MIN_DRAG) return null;
  const w = SNAP_WINDOW_VH * vh;
  for (const z of zones) {
    if (y < z.first - STOP_TOL && z.first - y <= w) return z.first;
    if (y > z.last + STOP_TOL && y < z.end - STOP_TOL && z.end - y <= w) return z.end;
  }
  return null;
}
