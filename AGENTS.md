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
- Journey paging is section-scoped and downward-only (sectionStep in journey-pacing.ts): one downward swipe/notch = one stage only between stages of the same journey; upward input is always native linear scrolling (never paged or settled, crossfades tied directly to scroll); entering or leaving a journey is plain native scrolling with no completion, spring-back or exit clamp, and settling snaps only when scroll rests inside a journey's span (it then fills the screen). A journey's last stop sits at the end of its pinned stretch so exiting has no dead length. No ink fade overlays on journey entry/exit, so the incoming image is always visible mid-scroll. Programmatic jumps use glideTo.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport geometry remains in USGS pixel space from FAA data; traffic-flight.ts integrates per-type, wind-corrected real-time speed separately, so map movement and card ground speed agree without changing pattern corners.
- Both traffic views share traffic-vector: supplied top renders use literal meter wingspans, other SVGs retain legacy scale; oblique axes use its calibrated camera.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Journey touch paging freezes native scroll during its glide (html.journey-paging), disables scroll anchoring, and pulls leftover native deltas back onto the landed page; a finger with no touch events for 150ms counts as lifted because touchend can be dropped under load.
- Fleet facts remain static; site-data SHOW_3D_MODELS gates visitor viewers/rendered sprites. Only hidden /models-preview bypasses it; uppercase GLBs stay glob-gated, effect-loaded with native poster hiding and isolated gestures.
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
