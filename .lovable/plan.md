# Mobile "Story mode" for the home sections (experiment, admin toggle)

Love the idea — it's a strong, familiar pattern on phones. Built as an add-on so nothing you have now is lost: the current fading-scroll version stays exactly as is, desktop is untouched, and an admin switch picks which one phone visitors see.

## What phone visitors see in Story mode

- Scrolling the page up and down works as normal. Each section (Zero to Hero, then Locations) fills one phone screen, then the rest of the home page continues below.
- Inside a section, stages move **sideways**, like Instagram stories:
  - Tap the right side or swipe left → next stage. Tap the left side or swipe right → previous stage.
  - The move uses a sharp-edged, box-turn effect (one face rotates away, the next rotates in), following your finger while dragging and finishing cleanly on release.
- **Progress bars at the top** (one thin segment per stage, filled for stages seen) replace the blue progress line. Same count as stages: 6 in Zero to Hero, 3 in Locations.
- Tapping forward on the last stage glides the visitor down to the next section (Zero to Hero → Locations → rest of home page). Back on the first stage does nothing.
- Copy, photos, step label and the "Build my training plan" button stay at the bottom of each stage, simple and clean.
- Anything tappable keeps working normally: airplanes in the traffic views, info cards, buttons, links. Taps on those never count as next/previous.
- No auto-advance timer (visitors move at their own pace). Reduced-motion visitors get a simple crossfade instead of the turn effect.

## Admin switch

- New setting on the existing admin page: **Mobile home sections: Fading scroll / Story mode**. Default stays Fading scroll, so nothing changes until you flip it.
- Only an admin can change it; every visitor's phone follows it. Desktop always keeps the scroll version.

## Technical details

- Migration: add `mobile_journey_mode text not null default 'scroll' check in ('scroll','story')` to `site_settings`; existing public-read / admin-only-update policies cover it.
- `use-site-settings.ts`: add `useMobileJourneyMode()` (read after mount, like the traffic pattern mode, so prerendered HTML stays the scroll version and there's no hydration mismatch).
- New `src/components/story-journey.tsx`: reuses the same stage data and stage media/traffic components as `flight-journey.tsx`. One 100dvh viewport, `touch-action: pan-y` so vertical scroll stays native; horizontal drag detected by pointer events after an axis lock, so vertical swipes are never captured. 3D turn via CSS `perspective` + `rotateY` on two faces, transform/opacity only, driven by drag progress, CSS transition to finish. Tap zones ignore events from `button, a, [data-interactive]` and traffic aircraft. Only the active stage's video/traffic animation runs.
- `index.tsx`: on coarse-pointer phones (≤ 767px) with mode `story`, render `StoryJourney` instead of `FlightJourney`; hero location chips jump to the matching Locations stage in either mode.
- Admin page: second toggle next to the accent color.
- Tests: mode parsing defaults to scroll; next/prev index logic (last forward → exit to next section, first back → stays). Check at 390×844 in a browser: swipes, taps, traffic-plane taps, progress bars, exit to next section; confirm desktop and the scroll mode are unchanged.
