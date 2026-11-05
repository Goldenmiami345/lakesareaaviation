import { useSyncExternalStore } from "react";

/**
 * Shared "an airplane's info card is open" state.
 *
 * The home journeys need it for two things: the 5s auto-advance must not yank a card away
 * while someone is reading it, and the tap that puts a card away must only do that, never
 * also flip the visitor to the next stage.
 */
let openCards = 0;
let closedAt = -Infinity;
const listeners = new Set<() => void>();

const sync = () => {
  listeners.forEach((l) => l());
};

/** Mark one card as shown; call the returned function when it goes away. */
export function openTrafficCard() {
  openCards += 1;
  sync();
  return () => {
    openCards = Math.max(0, openCards - 1);
    if (openCards === 0) closedAt = Date.now();
    sync();
  };
}

/** True while any airplane's info card is on screen. */
export function trafficCardIsOpen() {
  return openCards > 0;
}

export function subscribeTrafficCard(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** React view of the same state (false on the server, so prerendered HTML never depends on it). */
export function useTrafficCardOpen() {
  return useSyncExternalStore(subscribeTrafficCard, trafficCardIsOpen, () => false);
}

/** True while a card is open or was put away within the last `ms` (covers the dismissing tap on any browser). */
export function trafficCardRecentlyOpen(ms = 700) {
  return openCards > 0 || Date.now() - closedAt < ms;
}
