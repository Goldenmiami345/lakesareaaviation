# Home page polish, live traffic pattern, and full site audit

## 1. Scrolling feel
- **Any scroll moves one page.** A single wheel click (even one notch on your Logitech) or a short finger flick moves to the next page. Wheel notches that come right after are ignored until the glide finishes, so you never skip two pages.
- **Partial movement while dragging.** If your finger stays on the screen, the slides blend along with it. When you lift your finger, the page finishes the move to the next page, or springs back if you only nudged it.
- **Soft entry and exit.** Scrolling from the "Zero to Hero" opening into Discovery Flight, and from the Airline page into Little Falls, becomes a normal smooth scroll. Soft fades at the top and bottom of each section remove the hard edges. Stepping starts once the photo fills the screen.
- **Airport steps.** Each airport (Little Falls → Fort Lupton → Cottonwood) takes exactly one scroll, and leaving into "More ways to train" fades softly instead of cutting.
- **Easy skipping.** A small, clean step list on the side jumps to any page, including "Locations". A "Back to top" control appears once you're deep in the page.

## 2. Locations shortcut
- Add a simple strip near the top of the home page with three tappable locations (Little Falls, Fort Lupton, Cottonwood). Each jumps straight to its airport page in the journey.

## 3. Label readability
- Redesign the small labels ("Accelerated flight training", "01 Discovery flight", and so on): solid blue pill, white bold text, wider letter spacing, slightly larger, and a soft shadow instead of the thin white outline that is hard to read.

## 4. Instrument cockpit
- Rebuild the small Garmin screen so its numbers and tapes look crisp and real. If generated imagery distorts them, I'll draw that screen by hand.
- Turn the still into a short, slow video: clouds moving past the windows while the real panel stays still. A still photo shows until the video loads, and the video only plays while that page is on screen.

## 5. Little Falls (KLXL) accuracy
- Re-check the FAA airport data for runways 13/31 and 18/36 (length, surface, elevation, any displaced threshold).
- Redraw the runway so its threshold starts before the crossing with 18/36, with no displaced threshold unless the FAA data shows one. Place the 1,000-ft markers by the hangars and taxiway.
- Make sure the overhead view shows a paved runway, not grass, and matches the Instrument and private-pilot views. Apply the same accuracy check to Fort Lupton (18V) and Cottonwood (P52).

## 6. Live traffic pattern (signature feature)
On each airport page, two or three of the school's real airplanes fly a left-hand traffic pattern on one runway. One is taking off, one is on downwind, and one is landing. There's also a touch-and-go on runway 13 at Little Falls.
- **Top-down planes:** for each plane, I'll make an overhead image based on our real fleet photos, keeping its paint and tail number. The images are generated with the best available model and checked against the real photos.
- **Realistic flight:** planes follow the runway heading, bank in the turns, and show takeoff and landing scale changes. Each tag shows its altitude: pattern altitude is 1,000 ft above the airport's FAA field elevation (for example, about 2,100 ft at Little Falls). I'll look up the exact field elevations.
- **Interaction:** hover over or tap a plane to see a small ForeFlight-style card (tail number, type, altitude, speed, phase of flight). Click it to open that plane on the Fleet page.
- **Discovery Flight and Private Pilot pages:** short generated videos (a plane on approach and a touch-and-go), each with a still photo until it loads.
- Performance: one lightweight animation loop that only runs while the airport page is on screen. Visitors with reduced motion get a still picture with tags you can tap.

## 7. Navigation glitch
- Reproduce the first-load bug where clicking Programs flashes the home page, using a fresh, uncached load. Then fix the cause, likely how the page loads when it's first opened compared with when it's opened from the menu. Verify every menu link on desktop and phone.

## 8. Full site audit
- Check all 24 pages on phone and desktop: broken images, layout overflow, image sizes and formats, alt text, page titles and descriptions, contrast, console errors, and that every page is still pre-built.
- Write up a short findings list and fix everything found.

## What I can't fully verify
- How it feels on a real iPhone and on your physical mouse. Please test after the build.
- AI-made videos and overhead plane images. I'll review them, but please confirm tail numbers and paint look right.

## Technical details
- `flight-journey.tsx`: wheel uses a gesture-start detector (first delta after quiet, ≥1 notch) and a lock until the glide finishes. Touch drag gives live progress, and on release it commits to ±1 stage using distance/velocity thresholds. Native scroll is kept at both section edges. Soft edges use gradient masks. Pacing tests are updated and rerun with `bun test`.
- New `traffic-pattern.tsx`: SVG/canvas overlay over each airport aerial. Path waypoints come from runway geometry (heading, threshold coordinates mapped to image pixels) and are stored in `site-data.ts` with the FAA elevation per airport. Each aircraft sprite is a transparent WebP.
- Nav glitch: check the prerender/hydration mismatch and the preload behavior. Test with a cold cache in Playwright.
- Record the new rules in AGENTS.md (the traffic-pattern data source, the gesture model).
