# Fix the phone home page opening: no jump to Discovery Flight, no flashing

## What you will see after the fix
- The home page opens on the "BECOME A PROFESSIONAL PILOT" photo and stays there, still, until you swipe.
- No flicker between pages while it loads.
- One swipe still moves exactly one section; cube swipes inside the stories stay as they are.

## Likely cause (to confirm first)
The last fix added a "keep at top" loop that, for 3 seconds after load, yanks the page back to the top every tenth of a second. At the same time the page's section-locking (scroll snap) is already switched on, and the page is still changing height while photos load and the story layout replaces the fading layout. Each height change makes the section lock pull the page down to the nearest section (Discovery Flight), then the loop yanks it back up. That tug-of-war is the back-and-forth flashing, and whichever side wins last decides where you land.

This is a diagnosis from reading the code; step 1 confirms it before anything changes.

## Steps
1. **Reproduce** on a phone-sized test browser (402x725, story mode on): record scroll position every frame for the first 4 seconds on reload, Back and a link to Home. Expected failure: position jumping between 0 and the Discovery Flight offset, ending off the top.
2. **Remove the tug-of-war** (one owner for the opening position, clean-code style: one job per piece):
   - Delete the 100ms "keep at top" loop entirely.
   - Keep section locking **off** while the page is loading. Turn it on only once the layout has stopped changing height (two quiet frames after fonts and the hero photo are ready) or on the first touch, whichever comes first, and do a single instant move to the top right before turning it on.
   - Leave the browser's own scroll memory off on the home page so it never restores an old spot; the existing top-of-page reset on navigation stays the only other thing that moves the page.
3. **Stop the layout swap from moving the page**: if the phone briefly renders the fading layout before switching to stories, the opening section heights must match so the swap does not shift anything (verify in step 1 trace; fix only if it shows up).
4. **Small test** for the rule "locking stays off until the page is settled or touched" in the existing story-snap tests.
5. **Re-run step 1**: position stays at 0 with no jumps for reload, Back, and link; then one swipe lands on Discovery Flight, a second on the next section. Screenshots of each.
6. Record the rule in the components guidance: the opening position has a single owner; never fight snap with timers.

## Technical details
- File: `src/lib/story-snap.ts` (`start()`: remove `keepTop`/`stopKeep`/`markTouched` interval logic; defer `set(true)` behind a settle gate using ResizeObserver quiet + `document.fonts.ready` + first `touchstart`).
- Possibly `src/components/flight-journey.tsx` only if the trace shows the scroll/story layout swap shifting height.
- Tests: `src/lib/story-snap.test.ts` (pure gate helper).
- `src/components/AGENTS.md`: replace the fresh-load rule.
