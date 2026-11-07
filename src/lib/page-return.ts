/** Explicit Home actions temporarily own scrolling; passive section settling must not compete. */
export const PAGE_RETURN_START = "page:return-start";
let returning = false;
let cancelReturn: (() => void) | null = null;

export function pageReturnActive(): boolean { return returning; }

export function returnToPageTop() {
  cancelReturn?.();
  const root = document.documentElement;
  returning = true;
  window.dispatchEvent(new Event(PAGE_RETURN_START));
  const snapped = root.classList.contains("story-snapping");
  root.classList.remove("story-snapping");
  let frame = 0, quiet = 0, previous = window.scrollY;
  const finish = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("touchstart", interrupt);
    window.removeEventListener("wheel", interrupt);
    window.removeEventListener("keydown", interrupt);
    returning = false;
    cancelReturn = null;
    if (snapped && root.classList.contains("story-phone")) root.classList.add("story-snapping");
  };
  const interrupt = () => { window.scrollTo({ top: window.scrollY, behavior: "instant" }); finish(); };
  cancelReturn = finish;
  window.addEventListener("touchstart", interrupt, { passive: true });
  window.addEventListener("wheel", interrupt, { passive: true });
  window.addEventListener("keydown", interrupt);
  const watch = () => {
    const y = window.scrollY;
    quiet = Math.abs(y - previous) < 0.5 ? quiet + 1 : 0;
    previous = y;
    // Re-arm only at the destination, or after an externally interrupted glide has stopped.
    if ((y <= 1 && quiet >= 2) || quiet >= 30) finish();
    else frame = requestAnimationFrame(watch);
  };
  window.scrollTo({ top: 0, left: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  frame = requestAnimationFrame(watch);
}