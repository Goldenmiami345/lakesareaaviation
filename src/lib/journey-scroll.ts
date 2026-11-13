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
/** Gentler ease (zero velocity and acceleration at both ends) for crossfades. */
const smootherstep = (t: number) => { const x = clamp(t); return x * x * x * (x * (x * 6 - 15) + 10); };

/** Fraction of each stage's scroll length that shows the stage unchanged before its crossfade. */
export const JOURNEY_HOLD = 0.72;
/**
 * Desktop (fine pointer) hold: short, so a single gentle wheel notch or trackpad nudge reaches the
 * crossfade; `desktopSettleTarget` then finishes the move in the direction the visitor scrolled.
 */
export const DESKTOP_JOURNEY_HOLD = 0.2;
/** Desktop: net movement (px) below which a rest counts as an accidental nudge, not a scroll. */
export const DESKTOP_SETTLE_DEADZONE = 16;
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

export function journeyFrame(g: JourneyGeometry, y: number, hold = JOURNEY_HOLD): JourneyFrame {
  const n = Math.max(1, g.count);
  const pos = stagePosition(g, y);
  const stage = Math.min(n - 1, Math.floor(pos));
  const local = pos - stage;
  const linear = stage < n - 1 ? clamp((local - hold) / (1 - hold)) : 0;
  // Within a pixel of a window edge the frame is exactly the resting frame: no 0.1% ghost of the
  // other stage after a settle lands on a whole pixel.
  const px = 1 / (Math.max(1, g.stage) * (1 - hold));
  const transition = linear <= px ? 0 : linear >= 1 - px ? 1 : smootherstep(linear);
  return {
    stage,
    next: Math.min(n - 1, stage + 1),
    transition,
    active: transition < 0.5 ? stage : Math.min(n - 1, stage + 1),
    copyOpacity: smoothstep(Math.abs(1 - 2 * transition)),
    progress: n > 1 ? clamp(pos / (n - 1)) : 1,
  };
}

/**
 * Where a scroll that came to rest at `y` should finish, or null to leave it alone.
 * Only a rest position inside a crossfade window is moved, and only to that window's nearer edge.
 */
export function settleTarget(g: JourneyGeometry, y: number, hold = JOURNEY_HOLD): number | null {
  const n = Math.max(1, g.count);
  const pos = (y - g.base) / Math.max(1, g.stage);
  if (!(pos > 0) || pos >= n - 1) return null;
  const stage = Math.floor(pos);
  const local = pos - stage;
  // One pixel of tolerance: a position already on a window edge (including one this function
  // produced, rounded to a whole pixel) is at rest.
  const edge = 1 / Math.max(1, g.stage);
  if (local <= hold + edge || local >= 1 - edge) return null;
  const midpoint = hold + (1 - hold) / 2;
  const target = local < midpoint ? stage + hold : stage + 1;
  return Math.round(g.base + target * g.stage);
}

/**
 * Desktop (wheel / trackpad) settle. Rest points are the stage landings (middle of each hold). A scroll
 * that comes to rest between two rest points finishes in the direction it was travelling, so one gentle
 * notch or nudge always shows the next stage and a scroll is never pulled back against its direction.
 * `start`: where the previous rest (or settle target) was. `dir`: sign of the visitor's last movement.
 * Untouched: rests on a rest point, before the first stage's rest point, once the last stage is fully
 * shown, nudges smaller than `deadzone` inside a hold, and a hold the scroll already passed into from
 * outside (a fling that stopped on a fully shown stage stays on it).
 */
export function desktopSettleTarget(g: JourneyGeometry, y: number, start: number, dir: number, hold = DESKTOP_JOURNEY_HOLD, deadzone = DESKTOP_SETTLE_DEADZONE): number | null {
  const n = Math.max(1, g.count);
  if (n < 2) return null;
  const S = Math.max(1, g.stage);
  const pos = (y - g.base) / S;
  const rest = (k: number) => k + (k < n - 1 ? hold / 2 : JOURNEY_TAIL / 2);
  if (pos <= rest(0) || pos >= n - 1) return null;
  let k = 0;
  while (k < n - 2 && pos >= rest(k + 1)) k += 1;
  const lo = rest(k), hi = rest(k + 1), edge = 1 / S;
  if (pos - lo <= edge || hi - pos <= edge) return null;
  const px = (u: number) => Math.round(g.base + u * S);
  const fading = pos > k + hold && pos < k + 1;
  if (Math.abs(y - start) < deadzone || !dir) {
    if (!fading) return null;
    return px(pos - lo < hi - pos ? lo : hi);
  }
  const startPos = (start - g.base) / S;
  if (dir > 0) {
    // Arrived in stage k's hold from above it: that stage is fully shown, leave it.
    if (!fading && pos < k + 1 && startPos < lo - 2 * edge) return null;
    return px(hi);
  }
  // Arrived in stage k+1's hold from below it.
  if (!fading && pos >= k + 1 && startPos > hi + 2 * edge) return null;
  return px(lo);
}

/** Longest distance `settleTarget` can ever move the page. */
export function maxSettleDistance(stage: number, hold = JOURNEY_HOLD) {
  return ((1 - hold) / 2) * stage;
}

/** Resting scroll position that shows stage `k` fully, with room to scroll either way before anything changes. */
export function stageLanding(g: JourneyGeometry, k: number, hold = JOURNEY_HOLD) {
  const n = Math.max(1, g.count);
  const i = clamp(Math.round(k), 0, n - 1);
  const inset = i < n - 1 ? hold / 2 : JOURNEY_TAIL / 2;
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
