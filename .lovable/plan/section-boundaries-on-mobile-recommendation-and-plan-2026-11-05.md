# Section boundaries on mobile: recommendation and plan

## Recommendation: let a hard swipe carry visitors past a section
Don't add a hard stop at section edges. Here's why:
- Every earlier version that tried to stop or "catch" a swipe (paging, snapping, blocking touches) caused the problems you reported: eaten swipes, 3–4 swipes to get back out, the page lagging and feeling stuck. The current smooth feel exists because nothing fights the finger.
- On phones, a hard swipe means the visitor *wants* to move fast. If we stop them, it feels like the page is fighting them. Apple and Google apps follow this rule too.
- Exiting already takes one swipe in both directions: nothing holds the visitor at the start or end of the Zero to Hero or Locations sections.

## What we can safely improve (no catching, no blocking)
1. **Make the last stage of each section easy to see.** Add a bit more scroll room after the final stage (Right Seat, and the last airport) so a quick fling still shows it before the next section slides in.
2. **Check one-swipe exits on a phone-sized screen.** Test a normal swipe out of both sections, going up and going down. The automatic "finish the fade" helper should never pull the visitor back into a section they're leaving. If it does at an edge, turn it off at section edges only.
3. **Leave the way visitors enter a section exactly as it is.**

## Technical details
- Increase the tail scroll room after a section's last stage in `src/lib/journey-scroll.ts` (around 0.35 → 0.5 of a stage, adjusted after testing), and update its unit tests.
- Check that `settleTarget` returns null on the first and last edges of each journey. Add a test so a resting position just outside a section never moves back inside.
- No touch, wheel or scroll interception and no scroll-snap, per the project's scrolling rules.
- Verify at 390×844 with simulated touch drags and flings. Run the tests and the build.
