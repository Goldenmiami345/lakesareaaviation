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

export function journeyShouldSettle(progress: number, count: number) {
  return progress > journeyLanding(0, count) && progress < journeyLanding(count - 1, count);
}

// One gesture = one stage. Returns the stage a gesture should land on, or null
// when the gesture should scroll natively (leaving the journey upward or downward).
export const JOURNEY_GESTURE_LOCK_MS = 500;
export const JOURNEY_SWIPE_PX = 40;

export function journeyGestureTarget(progress: number, count: number, direction: 1 | -1): number | null {
  const length = Math.max(1, count);
  const rawPosition = clamp(progress) * length - JOURNEY_HOLD / 2;
  // Browser scroll coordinates round to pixels; treat near-landings as exact.
  const nearest = Math.round(rawPosition);
  const position = Math.abs(rawPosition - nearest) < 0.01 ? nearest : rawPosition;
  const target = direction === 1 ? Math.floor(position + 1e-9) + 1 : Math.ceil(position - 1e-9) - 1;
  if (target < 0 || target >= length) return null;
  return target;
}

// Stage-to-stage glide: a fixed, eased animation so every step feels the same
// on every browser (native smooth scroll varies wildly and can crawl on iOS).
export const JOURNEY_GLIDE_MS = 720;
export function journeyEase(t: number) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Wheel gesture detection. Trackpad/Magic Mouse inertia keeps firing decaying
// wheel events for a second or more; those belong to the gesture that already
// stepped. A pause or a fresh, stronger push starts a new gesture, and a
// continuously spinning wheel still advances after a cooldown so it never feels stuck.
export const JOURNEY_WHEEL_GAP_MS = 180;
export const JOURNEY_WHEEL_REPEAT_MS = 1100;
export function journeyWheelStartsGesture(input: { gapMs: number; delta: number; lastDelta: number; sinceStepMs: number }) {
  const { gapMs, delta, lastDelta, sinceStepMs } = input;
  if (sinceStepMs < 260) return false;
  if (gapMs > JOURNEY_WHEEL_GAP_MS) return true;
  if (Math.abs(delta) > Math.abs(lastDelta) * 1.5 + 4) return true;
  return sinceStepMs > JOURNEY_WHEEL_REPEAT_MS && Math.abs(delta) >= 12;
}
