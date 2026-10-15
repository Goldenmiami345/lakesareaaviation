# Smoother homepage journey + Zero to Hero opening

## Opening message
- Change the headline to **“Zero to Hero.”**
- Use the small label **“Accelerated flight training”** and supporting line **“From your first flight to commercial pilot and instructor.”**
- Keep **“Build my training plan”** as the main action.
- Remove the CFI/CFII exam facts from the opening; retain them in the CFI & CFII journey step, with its existing 4–6 week timeline.
- Keep the current photo, royal-blue accents, typography, and minimal layout. Update the homepage search and sharing descriptions to reflect the full training path; do not imply a guaranteed zero-to-hero completion time.

## Easier step-to-step scrolling
The current journey continuously fades and zooms images across each step, while its text switches at the halfway point. Replace that with a shared, deliberately paced sequence:
- Give each flight and airport step a longer **settled reading window**, followed by a shorter, smooth transition. Start with roughly 60% hold and 40% transition, and moderately increase the scroll distance per step.
- Keep the photo, heading, active stage marker, and action synchronized so the words do not jump ahead of the image.
- Soften the copy changes with a restrained fade and small movement; remove the blur-based entrance from journey copy.
- Make the first and last steps comfortable to land on, including the handoff from the flight path to the airports and then additional services.
- Make stage-dot clicks land in the middle of the corresponding reading window rather than near a transition boundary. Enlarge mobile touch targets without enlarging the visible dots.
- Preserve natural scrolling in both directions: no forced timed pauses, scroll locking, or automatic snapping. Fast deliberate scrolling remains possible.
- Preserve existing airport zoom-out framing, all six flight steps, all three airports, and the subtle right-side scroll signal.

## Technical approach
- Use one scroll-position mapping for settled windows, eased transitions, stage selection, and stage-click destinations in `FlightJourney`.
- Measure against the actual sticky viewport height so mobile browser controls do not shift transition boundaries unexpectedly.
- Keep animation work frame-scheduled and limited to transforms and opacity; respect reduced-motion preferences.
- Keep changes limited to homepage copy and journey presentation. Record the shared pacing rule in the project architecture notes during implementation.

## Validation
- Test at the current 402×725 phone size, a taller phone size, and desktop.
- Scroll slowly, flick quickly, reverse near boundaries, and click every stage dot in both journeys.
- Confirm each step has a readable settled interval, text and imagery agree, and the final steps do not disappear prematurely.
- Confirm actions still open the correct pages, no copy or controls overlap, no horizontal overflow occurs, and reduced-motion behavior remains usable.
