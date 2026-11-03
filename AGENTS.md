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
- Homepage Lenis (fine pointer) is off inside pinned journeys. Journey scrolling: page downward only between stages of the SAME fully pinned viewport (top<=0, bottom>=viewport height); >=10px touch, wheel/burst or down keys advance one stage. Boundaries, last-stage exit and upward scroll are native, never settled; entry momentum never triggers paging. Upward uses stacked panels/copy; downward paging switches to crossfade at once via journey-blend; first stage pins within 24px; eligibility rechecks mid-swipe. Reduced motion is stack/no glides. Glides always release gate/freeze (done, no-op, PAGE_MS+150ms); never need mouse movement. Jumps use glideTo/goToJourneyPage.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport geometry remains in USGS pixel space from FAA data; traffic-flight.ts integrates per-type, wind-corrected real-time speed separately, so map movement and card ground speed agree without changing pattern corners.
- Both traffic views share traffic-vector: supplied top renders use literal meter wingspans, other SVGs retain legacy scale; oblique axes use its calibrated camera.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Journey touch paging freezes only during its glide, disables anchoring, briefly guards queued touch deltas only inside pins; 150ms without touch events counts as lifted. Multitouch cancels the glide.
- Fleet has no galleries; SHOW_3D_MODELS enables three model covers and traffic-card media (SSR photo poster). Shared media loads at 300px margin, spins 9deg/s immediately, pauses on interaction/resumes after 3s, clamps zoom and resets on double-tap; gestures stay isolated. View photo opens cutouts; other cards stay photos. /models-preview bypasses the flag.
- AirportScene shares one USGS image/traffic viewBox; phone framing uses the protected rectangle, desktop searches centroid placements around actual text/CTA/HUD/rail boxes rather than excluding the whole lower band, so zoom can increase without hiding aircraft. Stage-zoom remains independent.
- Training-plan leads are saved via the public submitTrainingLead server function (publishable client, insert-only RLS, admin-only reads, hashed-IP rate limit via recent_lead_count) so no lead depends on email delivery.
- Aerial runway selection uses live METAR with FAA/calm fallback; the photo-calibrated oblique runway remains 13. Both views share use-traffic-animation.ts for leg-entry calls, targets and live card values, so collision/reduced-motion behavior cannot drift.
- Journey stages zoom in-stage (src/lib/stage-zoom.ts transforms each layer's .journey-zoom wrapper, overlays included); the stage owns pinch/double-tap via touch-action, html.journey-zoomed pauses paging, and any multi-touch gesture cancels paging so pinches never page.
- Traffic tag sides are chosen once per display window with a look-ahead along the airplane path (fitTagSide in traffic-ui.tsx); no per-frame re-layout, positions snap to whole pixels, and a callout with no clear side is skipped, because per-frame flipping made tags jitter.
- Call placement uses the pure traffic-call-placement helper with screen-pixel leader caps and projected runway-relative side preference; panel collisions flip sides rather than extending leaders, keeping zoom independent of placement.
- Card placement is WeakMap-locked until out of bounds; stable contain-fit media prevents jumps. Shared desktop selection ignores aircraft pointerleave: close on actual pointer travel >24px away from opening point when over neither hit nor card, or panel exit; touch taps unchanged.
- Light surfaces (cards, popovers/menus) read the single --surface-light token in src/styles.css (beige color trial, see docs/color-trial-beige-2026-10-31.md for values and the one-line revert), so the trial is reversible in one place.
- Page changes have exactly one animation: the CSS page-enter in SiteLayout keyed on the resolved leaf match id (not the pathname) with no router view transition, and links preload on viewport, because pathname keying replayed the fade on the old page before the new one loaded.
- Browser-only libs (model-viewer) load only behind import.meta.env.SSR guards, never in the server bundle (a shared chunk once blanked all SiteShell pages); never import.meta.glob public/ files. `build` runs scripts/check-prerender-dist.mjs to fail on pages missing heading/copy (Lovable forces failOnError off).
- Supplied GLBs stay exact in public/models under uppercase registrations with _headers cache/MIME and versioned URLs; shared model-settings owns camera/light/span and mesh-sphere/aspect fitting for fleet/traffic slots; load/resize fit the rotation envelope and reset restores it. Keep walk-around pointers/CDN objects; Apache banner stays unchanged.
- Hero comparisons stay separate, noindex, sitemap-excluded, without floating controls. Home uses Pixel Perfect Snapshot sunset assets: tall below 3:2 viewport aspect, wide otherwise, avoiding AI-redrawn planes.
- Normalize route pathnames with sitePath before shell visibility decisions: prerender visits slash-suffixed URLs while browser navigation often does not, and differing action-bar trees cause hydration failure.
- TrafficPath derives lines and final extension from patternWaypoints used by the flight engine; labels are placed only after mount in constant screen pixels with live UI/card collision checks, so maps, aircraft and labels share geometry without hydration-dependent rendering.
- The drawn pattern (TrafficPath) follows site_settings.traffic_pattern_mode (off/pulse/always), read after mount so prerendered HTML never depends on it; pulse pauses while a card is open and never runs in reduced motion.
- Radio calls hold CALL_DURATION_MS (traffic-flight.ts); the calling plane is marked with .is-calling (pulsing target, full leader) and the SVG gets .has-call to dim other history trails, all in CSS so timing and placement code stay untouched.
- Sequencing is shared by both views: equal-period slots reserve final/runway/departure plus 5s. Real-speed rollout/climb, small arrival extension and departure-side upwind/downwind elongation absorb delay without recurring circles; validate spacing/order and <0.2 circles/lap. KLXL aerial has Apache/Phoenix/Cardinal. Groups carry legOf data-leg.
- USE_RENDERED_TOP_SPRITES (site-data) draws photo-derived top renders (src/assets/fleet/top, width = wingspan) for those registrations in the aerial view only, at the vectors' ~3x display scale (full 640px source) with an alpha-derived shadow; the oblique view and other registrations keep SVG vectors, independent of SHOW_3D_MODELS.
- Airport imagery mounts within 1.5 viewports or on a "journey-target" glide event, phone or desktop aerial only (first-load weight). Models spin only when visible.
