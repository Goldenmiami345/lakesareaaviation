# Keep swiping from Zero to Hero into Locations (phone Story mode)

## What you'll get
- On the last Zero to Hero page, swiping right (or tapping the right side) turns the page like a cube and lands you on the first Locations page, ready to keep swiping through the airports.
- Swiping up from Zero to Hero still takes you down to Locations the normal way.
- Swiping left on the first Locations page takes you back to the last Zero to Hero page. (Today it does nothing there; this makes "back" work both ways.)
- Auto-advance keeps looping for visitors who haven't touched it; only a real swipe or tap moves you on to the next section.

## Steps
1. **Reproduce first.** The "swipe right to move on" code is still there, so something newer must be getting in its way. In a phone-sized test I'll swipe and tap forward on the last Zero to Hero page and record where the page ends up: stuck, bounced back, or skipped past Locations. The likely suspects are the newer opening-position and back-to-top fixes, which also control scroll snapping.
2. **Fix the cause** so the forward move always lands exactly on Locations, page 1. Snapping stays paused while the page turns and switches back on once you've arrived, the same way the logo's return-to-top works.
3. **Add the backward move:** swiping left on the first Locations page turns back to the last Zero to Hero page.
4. **Test it** in a phone-sized browser: forward swipe, forward tap, a fast flick, backward swipe, and a normal up/down swipe. Then run the existing tests and add one for the backward step.

## Technical notes
- `exitSection` in `flight-journey.tsx` picks the next `.story-snap` anchor and jumps there instantly. Its `pageReturnActive()` guard, and the story-snap settle gate, may be cancelling or overriding that jump.
- The jump should use the same pause, move, re-enable sequence as `page-return.ts`.
- Add `"enter-prev"` to `storyStep` for dir -1 at index 0, so it can step back into the previous story section at its last stage, reusing the `story:enter` animation mirrored.
- Update the Story rule in `src/components/AGENTS.md`.
