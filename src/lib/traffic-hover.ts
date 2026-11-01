export const HOVER_LEAVE_PX = 24;
export function shouldCloseTrafficHover(origin: { x: number; y: number }, pointer: { x: number; y: number }, insidePanel: boolean, overHitOrCard: boolean) {
  return !insidePanel || (!overHitOrCard && Math.hypot(pointer.x - origin.x, pointer.y - origin.y) > HOVER_LEAVE_PX);
}