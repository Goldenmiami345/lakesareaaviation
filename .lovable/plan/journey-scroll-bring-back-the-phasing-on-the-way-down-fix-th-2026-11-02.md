# Journey scroll: bring back the phasing on the way down, fix the stuck first swipe

## What changes for visitors
- **Scrolling up** stays exactly as it is now (normal, fast scrolling through stacked pages, no snap-back).
- **Scrolling down** always plays the zoom/crossfade phasing between stages again, even right after scrolling up. Stages never just slide or vanish on the way down.
- **First stage of each journey** (e.g. Discovery Flight → Private Pilot): one swipe, wheel notch or key press moves to the next stage, every time.

## Causes found in the code
1. After any upward scroll the journey switches to "stack" mode, and it only switches back to the phasing mode when the page sits *exactly* on a stage. After native upward scrolling it almost never does, so the next downward move slides the stacked panels instead of phasing. That's the "just disappears" look.
2. On phones, whether a swipe can page is checked only when the finger first touches down. If the page is still settling into the journey (momentum, or a few pixels short of fully pinned), the swipe is marked "not eligible" and runs as plain scrolling, so you need a second swipe. Desktop has a similar edge: landing 1–2 px above the journey's first stage counts as "not pinned".

## Fix
1. **Down always phases:** when a downward gesture starts in stack mode, switch to phasing right away. Use a short (~180 ms) blend from the stacked look to the phasing look at the current position, then run the normal phasing glide to the next stage. Upward still switches to stack immediately.
2. **First swipe always counts:** check eligibility again during the swipe (not just at touch-down). Allow a small tolerance (a few px, plus the native momentum still settling) around the journey's first stage so it counts as pinned. Stop any leftover native momentum before the glide.
3. Keep everything else from the current rules: boundaries and leaving the last stage stay native, upward never snaps, wheel/burst gate and freeze always release, zoom/multitouch rules, reduced motion (stack only, no glides), video only on the active stage.

## Tests
- Pure tests: a downward gesture from any position (mid-stack included) asks for phasing mode; pinned check accepts positions within tolerance of the first stage.
- Extend `scripts/journey-walk-check.py`: (a) enter each journey with a soft swipe, then a single 16 px swipe or one wheel notch must land on stage 2; (b) scroll up halfway between stages, then swipe down: no `data-stack` panels during the glide and the stage opacities change (phasing).
- Run all tests and the prerender gate. Update the scroll bullet in AGENTS.md.

## Technical notes
- Files: `src/components/flight-journey.tsx` (goDown sets mode `fade` immediately with blend; touchmove re-evaluates `pinnedStages`; tolerance), `src/lib/journey-pacing.ts` (`pinnedStepDown` tolerance, mode helper), `journey-pacing.test.ts`, `src/styles.css` (blend transition), walk-check script, `AGENTS.md`.
