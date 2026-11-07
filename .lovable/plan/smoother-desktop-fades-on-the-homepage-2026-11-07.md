# Smoother desktop fades on the homepage

Scrolling still drives everything exactly as now (no paging, no snapping, no scroll hijacking). Only how the photos and text fade on computers changes. Phones are untouched.

## Why it feels instant today
- Each page stays still for 72% of its scroll and squeezes the whole fade into the last 28%, so one or two mouse-wheel clicks finish it.
- Mouse wheels move in big steps, and the fade follows each step exactly, so it jumps instead of gliding.
- The text fades fully out and in within that same short window.

## Changes (desktop only)
1. **Longer fade window:** stays still for about 50% of each page's scroll, then fades over the other 50%. That's nearly twice as long, with the same total scroll length per page.
2. **Softer curve:** a gentler start and finish to the fade, so it doesn't snap at either end.
3. **Glide between wheel clicks:** the picture eases toward where your scroll is over about 150–200ms, so each wheel click blends instead of stepping. The fade always catches up to your scroll, never runs ahead of it, and stops when you stop.
4. **Text overlap:** the old text fades out and the new text fades in more gradually, with a little upward drift, so words don't pop.
5. Visitors who ask their device for reduced motion keep the current direct behaviour.

## Technical details
- `src/lib/journey-scroll.ts`: make the hold amount a parameter (desktop 0.5, phone stays 0.72), use smootherstep, and widen the copy-opacity curve. Update its tests with concrete values.
- `src/components/flight-journey.tsx`: on desktop scroll mode, keep a displayed position that eases toward the target each animation frame (exponential approach, about 180ms, ends within a pixel). Settling and stage links keep using the real scroll position.
- Check desktop scroll in Playwright with wheel steps, and confirm that frames between clicks move gradually; run tests.
