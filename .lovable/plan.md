# Home page polish: mobile text, pacing, planes and page transitions

## 1. Private Pilot picture
- Bring back the earlier approach angle for the Private Pilot step (the version before the re-rendered Little Falls approach), keeping its corrected runway details where they don't change the angle.
- Keep the animated fleet airplanes flying the traffic pattern on the three airport views.

## 2. Traffic pattern airplanes
- Slow them down a lot (about 3x slower than now), so one circuit takes several minutes and movement is calm.
- Tighten each pattern by 10% (downwind closer to the runway, shorter upwind and final extensions).
- Clicking an airplane opens its exact spot on the Fleet page with one clean transition.

## 3. Page-change glitch (Fleet flips back and forth)
- First reproduce the flip (home → plane click → Fleet, and the top menu) in a recorded browser run, frame by frame, to confirm the real cause before fixing it. Suspects: the home page's scroll-snap and journey listeners still running while the next page loads, the Fleet page's jump to the airplane's tail number, and the immediate scroll reset.
- Fix it so the old page stays still until the new page is fully ready, then the new page appears once, with a short soft fade.
- Confirm all 24 public pages are prerendered and that every page link preloads, so pages open from ready-made files.

## 4. Location buttons under the hero
- Replace "Train at" with just the pin icon.
- Show "Little Falls, MN", "Fort Lupton, CO", "Cottonwood, AZ" on one row, no airport codes, smaller pills so they fit a phone width.

## 5. Text takes no more than 30% of the screen on home animations
- For every home step (Discovery → Right Seat and the three airports), the text block under the blue label is capped at about 30% of the screen height on phones.
- On phones: smaller big number/title, tighter spacing, shorter one-line description, smaller button, and the bottom Call/Apply bar no longer stacks on top of the text.
- Desktop gets small spacing reductions only.

## 6. Section-to-section flow (direct, 1:1 with the finger or wheel)
- Hero → Discovery Flight: no automatic jump. The page moves exactly with the visitor's scroll, the Discovery view fades and slides up like a new page, then rests on Discovery.
- Right Seat → Little Falls: same direct, follow-the-finger handoff, then it settles with the full Little Falls view on screen.
- Little Falls → Fort Lupton → Cottonwood: one swipe or wheel nudge per airport, as now.
- After Cottonwood: normal free scrolling into the next section, with a soft fade instead of a sudden switch.
- The automatic "glide into the first page" added last time is removed; a single swipe still moves one page while inside the steps.

## Technical details
- `flight-journey.tsx`: remove wheel "entering" auto-glides; keep the snap stops only between interior stages; entry and exit corridors use native scroll with eased opacity and translate tied to scroll position; cap the copy block with `max-h-[30svh]` and reduced mobile type scale; hide HUD line on small screens.
- `traffic-pattern.ts` / `site-data.ts`: multiply offset and extension by 0.9 and add a time scale (about 0.33) in `sampleAtTime`; update the speed test to the new range.
- `router.tsx`: tear down `journey-snap` and pending listeners before navigating; consider `defaultViewTransition` for a single cross-fade; verify the Fleet page's hash scroll runs once after mount.
- Restore `02-runway-corrected.webp` from the earlier commit.
- Verify on 390×844 and 1280×900: text height ratio per stage, one-swipe paging, hero/journey handoffs, plane click → Fleet with no flip, and the prerendered page list.
