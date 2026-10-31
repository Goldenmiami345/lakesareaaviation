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
