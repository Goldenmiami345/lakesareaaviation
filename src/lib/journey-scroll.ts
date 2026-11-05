// Scroll-driven journey pacing. Pure functions over document scroll positions; no DOM, no timers.
//
// Model: the browser scrolls natively everywhere. A journey section pins its viewport and plays a
// crossfade whose progress is a pure function of scrollY. Each stage owns one scroll length
// (`stage` px): the first JOURNEY_HOLD of it shows the stage unchanged, the rest crossfades into
// the next stage. Nothing ever intercepts, delays or discards the visitor's input; the only
// assistance is `settleTarget`: when a scroll comes to rest INSIDE a crossfade, the page finishes
// the crossfade toward the nearer edge (at most half a crossfade window), so a stage is never
// left half-blended.

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };

/** Fraction of each stage's scroll length that shows the stage unchanged before its crossfade. */
export const JOURNEY_HOLD = 0.72;
/** Extra hold after the last stage (in stage lengths) before the section unpins and the next one slides in. */
export const JOURNEY_TAIL = 0.5;

/** `base`: document y where the section's viewport pins. `stage`: scroll px per stage. */
export type JourneyGeometry = { base: number; stage: number; count: number };

/** Scroll length of a journey's pinned stretch (section height minus the pinned viewport). */
export function pinnedLength(stage: number, count: number) {
  return (Math.max(1, count) - 1 + JOURNEY_TAIL) * stage;
}

/** Stage px from a measured section: inverse of `pinnedLength`. */
export function stageLengthFrom(sectionHeight: number, viewportHeight: number, count: number) {
  return Math.max(1, sectionHeight - viewportHeight) / (Math.max(1, count) - 1 + JOURNEY_TAIL);
}

/** Position in stage units, clamped to the pinned range: k = stage k's hold starts, k + HOLD = its crossfade starts. */
export function stagePosition(g: JourneyGeometry, y: number) {
  return clamp((y - g.base) / Math.max(1, g.stage), 0, Math.max(1, g.count) - 1 + JOURNEY_TAIL);
}

export type JourneyFrame = { stage: number; next: number; transition: number; active: number; copyOpacity: number; progress: number };

export function journeyFrame(g: JourneyGeometry, y: number): JourneyFrame {
  const n = Math.max(1, g.count);
  const pos = stagePosition(g, y);
  const stage = Math.min(n - 1, Math.floor(pos));
  const local = pos - stage;
  const linear = stage < n - 1 ? clamp((local - JOURNEY_HOLD) / (1 - JOURNEY_HOLD)) : 0;
  // Within a pixel of a window edge the frame is exactly the resting frame: no 0.1% ghost of the
  // other stage after a settle lands on a whole pixel.
  const px = 1 / (Math.max(1, g.stage) * (1 - JOURNEY_HOLD));
  const transition = linear <= px ? 0 : linear >= 1 - px ? 1 : smoothstep(linear);
  return {
    stage,
    next: Math.min(n - 1, stage + 1),
    transition,
    active: transition < 0.5 ? stage : Math.min(n - 1, stage + 1),
    copyOpacity: Math.abs(1 - 2 * transition),
    progress: n > 1 ? clamp(pos / (n - 1)) : 1,
  };
}

/**
 * Where a scroll that came to rest at `y` should finish, or null to leave it alone.
 * Only a rest position inside a crossfade window is moved, and only to that window's nearer edge.
 */
export function settleTarget(g: JourneyGeometry, y: number): number | null {
  const n = Math.max(1, g.count);
  const pos = (y - g.base) / Math.max(1, g.stage);
  if (!(pos > 0) || pos >= n - 1) return null;
  const stage = Math.floor(pos);
  const local = pos - stage;
  // One pixel of tolerance: a position already on a window edge (including one this function
  // produced, rounded to a whole pixel) is at rest.
  const edge = 1 / Math.max(1, g.stage);
  if (local <= JOURNEY_HOLD + edge || local >= 1 - edge) return null;
  const midpoint = JOURNEY_HOLD + (1 - JOURNEY_HOLD) / 2;
  const target = local < midpoint ? stage + JOURNEY_HOLD : stage + 1;
  return Math.round(g.base + target * g.stage);
}

/** Longest distance `settleTarget` can ever move the page. */
export function maxSettleDistance(stage: number) {
  return ((1 - JOURNEY_HOLD) / 2) * stage;
}

/** Resting scroll position that shows stage `k` fully, with room to scroll either way before anything changes. */
export function stageLanding(g: JourneyGeometry, k: number) {
  const n = Math.max(1, g.count);
  const i = clamp(Math.round(k), 0, n - 1);
  const inset = i < n - 1 ? JOURNEY_HOLD / 2 : JOURNEY_TAIL / 2;
  return Math.round(g.base + (i + inset) * g.stage);
}

// Altitude readout: each stage rests on a round target (evenly spaced to `max`, whole
// thousands); the value only counts between targets while a crossfade is moving.
export function journeyStageAltitude(index: number, count: number, max = 35000) {
  const length = Math.max(1, count);
  return length < 2 ? 0 : Math.round((clamp(index, 0, length - 1) / (length - 1)) * max / 1000) * 1000;
}
export function journeyAltitude(frame: { stage: number; next: number; transition: number }, count: number, max = 35000) {
  const a = journeyStageAltitude(frame.stage, count, max), b = journeyStageAltitude(frame.next, count, max);
  return Math.round(a + (b - a) * frame.transition);
}
