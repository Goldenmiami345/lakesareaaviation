<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Shared navigation and layout live in src/components/site-shell.tsx so every public page stays visually consistent.
- Static program, fleet, location, and testimonial content lives in src/lib/site-data.ts to keep route pages concise and facts consistent.
- Aircraft imagery must originate from Lakes Area Aviation's official site and preserve each real airplane's registration, paint, and physical details.

- All 24 public pages are prerendered via the explicit `pages` list in vite.config.ts; add new static routes there (router uses trailingSlash "preserve" so prerender requests do not redirect-loop).
- Bundled photos are WebP (heroes max 1920px, fleet cards max 1280px) to keep pages light.
- The global accent theme is read from the public site_settings row; only a database-verified admin role may change it.
- Scroll-journey stages may use optimized CDN video with a real-photo poster; video plays only while its stage is active to protect mobile performance.
- Both homepage journeys use the shared pure journey-pacing mapping for reading windows, transitions, active steps, and click destinations; measure scrolling against the sticky viewport so imagery and copy stay synchronized on mobile.
- Journey scrolling (flight-journey.tsx + pure journey-pacing.ts): downward = one gesture, one stop. Stops are every journey stage plus each journey's exit (next section top); inside a journey zone (its top in view until its exit) any downward drag >=10px, wheel notch/trackpad burst (one gesture until 180ms quiet after landing) or PageDown/Space/ArrowDown glides to nextStopDown, and native downward momentum drifting into a zone is carried to the next stop. Ordinary content outside zones scrolls natively. Upward is never paged or settled: journeys switch to stack mode (stage k at translateY(k - stackProgress), per-stage copy riding its panel) and scroll 1:1 with native momentum. Modes switch only at a stop or outside a pinned stretch (isModeSwitchPoint) so the change is invisible; reduced motion is stack mode with no glides. Programmatic jumps use glideTo / goToJourneyPage.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport geometry remains in USGS pixel space from FAA data; traffic-flight.ts integrates per-type, wind-corrected real-time speed separately, so map movement and card ground speed agree without changing pattern corners.
- Both traffic views share traffic-vector: supplied top renders use literal meter wingspans, other SVGs retain legacy scale; oblique axes use its calibrated camera.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Journey touch paging freezes native scroll during its glide (html.journey-paging), disables scroll anchoring, and pulls leftover native deltas back onto the landed page; a finger with no touch events for 150ms counts as lifted because touchend can be dropped under load.
- Fleet cards have no galleries; SHOW_3D_MODELS turns each cover into its slow-spinning, hover-paused draggable model (photo poster). Only hidden /models-preview bypasses it; uppercase GLBs stay glob-gated and effect-loaded.
- AirportScene shares one USGS image/traffic viewBox; phone framing uses the protected rectangle, desktop searches centroid placements around actual text/CTA/HUD/rail boxes rather than excluding the whole lower band, so zoom can increase without hiding aircraft. Stage-zoom remains independent.
- Training-plan leads are saved via the public submitTrainingLead server function (publishable client, insert-only RLS, admin-only reads, hashed-IP rate limit via recent_lead_count) so no lead depends on email delivery.
- Aerial runway selection uses live METAR with FAA/calm fallback; the photo-calibrated oblique runway remains 13. Both views share use-traffic-animation.ts for leg-entry calls, targets and live card values, so collision/reduced-motion behavior cannot drift.
- Journey stages zoom in-stage (src/lib/stage-zoom.ts transforms each layer's .journey-zoom wrapper, overlays included); the stage owns pinch/double-tap via touch-action, html.journey-zoomed pauses paging, and any multi-touch gesture cancels paging so pinches never page.
- Traffic tag sides are chosen once per display window with a look-ahead along the airplane path (fitTagSide in traffic-ui.tsx); no per-frame re-layout, positions snap to whole pixels, and a callout with no clear side is skipped, because per-frame flipping made tags jitter.
- Call placement uses the pure traffic-call-placement helper with screen-pixel leader caps and projected runway-relative side preference; panel collisions flip sides rather than extending leaders, keeping zoom independent of placement.
- Card placement is locked per mounted card in a WeakMap and recomputed only if its bounds leave the viewport; full-width top media has stable height, contain-fit and alpha margins to prevent late jumps and edge clipping.
- Light surfaces (cards, popovers/menus) read the single --surface-light token in src/styles.css (beige color trial, see docs/color-trial-beige-2026-10-31.md for values and the one-line revert), so the trial is reversible in one place.
- Page changes have exactly one animation: the CSS page-enter in SiteLayout keyed on the resolved leaf match id (not the pathname) with no router view transition, and links preload on viewport, because pathname keying replayed the fade on the old page before the new one loaded.
- Browser-only libs (model-viewer) load only behind import.meta.env.SSR guards, never in the server bundle (a shared chunk once blanked all SiteShell pages); never import.meta.glob public/ files. `build` runs scripts/check-prerender-dist.mjs to fail on pages missing heading/copy (Lovable forces failOnError off).
- Supplied GLBs stay in public/models under uppercase registrations with public/_headers cache/MIME rules; model camera/lighting and exact wingspans live in model-settings for tested consistency.
- Hero comparisons live in a standalone noindex, sitemap-excluded prerendered route without shared floating controls; they never modify the production homepage, so photo approval remains independent.
- Normalize route pathnames with sitePath before shell visibility decisions: prerender visits slash-suffixed URLs while browser navigation often does not, and differing action-bar trees cause hydration failure.
- TrafficPath derives lines and final extension from patternWaypoints used by the flight engine; labels are placed only after mount in constant screen pixels with live UI/card collision checks, so maps, aircraft and labels share geometry without hydration-dependent rendering.
- The drawn traffic pattern (TrafficPath) renders only when site_settings.show_traffic_pattern is true, read client-side after mount (use-site-settings.ts), so prerendered HTML never depends on it; planes, targets, calls and cards always show.
- Radio calls hold CALL_DURATION_MS (traffic-flight.ts); the calling plane is marked with .is-calling (pulsing target, full leader) and the SVG gets .has-call to dim other history trails, all in CSS so timing and placement code stay untouched.
- Runway sequencing lives in pure traffic-sequence.ts (TrafficSchedule): laps are decided in base-turn order and downwinds extend (makeFlightPlan extendPx) until the threshold-to-liftoff window clears every other window by RUNWAY_BUFFER_S and final spacing holds; use-traffic-animation samples the schedule, and traffic-sequence.test.ts simulates 60 minutes per airport.
- USE_RENDERED_TOP_SPRITES (site-data) draws photo-derived top renders (src/assets/fleet/top, width = wingspan) for those registrations in the aerial view only, at the vectors' ~3x display scale (full 640px source) with an alpha-derived shadow; the oblique view and other registrations keep SVG vectors, independent of SHOW_3D_MODELS.
