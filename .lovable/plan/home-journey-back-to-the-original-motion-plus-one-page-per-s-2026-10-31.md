# Home journey: back to the original motion, plus one page per swipe

## Goal
Bring back the original zoom-scroll feel: imagery and text move directly with your finger or scroll wheel. Add one rule on top: a single swipe or wheel flick moves exactly one page and then stops there, never two.

## What changes for visitors
- Scrolling feels natural again. Pages zoom and fade as you move, with no frozen moments and no sudden auto-jumps.
- Each swipe or wheel flick glides to the next page at the browser's normal speed (about half a second to a second) and stops there.
- A hard fling can't carry you past a page. You need a new swipe to keep going.
- At the first and last page you leave the section normally, so nothing traps you.
- Visitors who turn on "reduce motion" on their device get plain scrolling.

## Approach
1. Remove the custom scroll handling added in recent rounds: wheel blocking, swipe interception, the auto-settle timer and the hand-made glide. The page goes back to plain native scrolling that drives the original zoom and fade.
2. Use the browser's built-in "snap" feature with one stop per page. It's set to be mandatory and can't be skipped (`scroll-snap-type: y mandatory` on the page, plus `scroll-snap-stop: always` on each stop). Safari, Chrome and Firefox all have this built in. It makes every flick stop at the next page, works the same with fingers, trackpads and mouse wheels, and uses the browser's own smooth movement.
3. Turn snapping on only while the journey is on screen. The rest of the site scrolls freely, and leaving the journey at either end works as usual.
4. Keep everything else unchanged: the page timing, the images, the side progress line, and the step buttons, which jump to the matching stop.

## Verification
- Phone and desktop tests: one swipe or flick moves one page, a hard fling still stops after one, swiping backward works, and you can leave at both ends.
- Run the existing pacing tests, removing the ones that only tested the removed custom handling.
- Physical iPhone and trackpad feel to be confirmed by you.

## Technical details
- In `flight-journey.tsx`, remove the wheel, touch, settle and glide code. Keep the scroll-to-render loop and pointer parallax.
- Add invisible snap stops absolutely positioned inside the tall section, one per stage, at `top = journeyLanding(i) * (sectionHeight - viewportHeight)`.
- Add `scroll-snap-type: y mandatory` to `html` only while the journey section intersects the viewport, using an IntersectionObserver that toggles a class. Drop it when reduced motion is on.
- Remove the unused helpers from `journey-pacing.ts` (`journeyGestureTarget`, `journeyWheelStartsGesture`, `journeyEase`, the glide and lock constants, and settle) and their tests.
- Update the AGENTS.md journey rules to say that native snap stops enforce one page per gesture.
