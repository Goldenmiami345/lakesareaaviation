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
- Both traffic views render the shared traffic-vector.tsx type silhouettes with photo-sampled paint tokens and preserve the legacy wingspan presentation multiplier; the oblique view projects vector axes through its existing camera so footprint and ground calibration stay independent of timing.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Journey touch paging freezes native scroll during its glide (html.journey-paging), disables scroll anchoring, and pulls leftover native deltas back onto the landed page; a finger with no touch events for 150ms counts as lifted because touchend can be dropped under load.
- Fleet cards use native <details> accordions so all specs stay in prerendered HTML; the full-screen aircraft viewer is a lazy, body-portaled chunk showing real photos until accurate per-tail 3D models exist.
- Training-plan leads are saved via the public submitTrainingLead server function (publishable client, insert-only RLS, admin-only reads, hashed-IP rate limit via recent_lead_count) so no lead depends on email delivery.
- Aerial runway selection uses live METAR with FAA/calm fallback; the photo-calibrated oblique runway remains 13. Both views share use-traffic-animation.ts for leg-entry calls, targets and live card values, so collision/reduced-motion behavior cannot drift.
- Journey stages zoom in-stage (src/lib/stage-zoom.ts transforms each layer's .journey-zoom wrapper, overlays included); the stage owns pinch/double-tap via touch-action, html.journey-zoomed pauses paging, and any multi-touch gesture cancels paging so pinches never page.
- Traffic tag sides are chosen once per display window with a look-ahead along the airplane path (fitTagSide in traffic-ui.tsx); no per-frame re-layout, positions snap to whole pixels, and a callout with no clear side is skipped, because per-frame flipping made tags jitter.
- Card placement is locked per mounted card in a WeakMap and recomputed only if its bounds leave the viewport; full-width top media has stable height, contain-fit and alpha margins to prevent late jumps and edge clipping.
- Light surfaces (cards, popovers/menus) read the single --surface-light token in src/styles.css (beige color trial, see docs/color-trial-beige-2026-10-31.md for values and the one-line revert), so the trial is reversible in one place.
- Page changes have exactly one animation: the CSS page-enter in SiteLayout keyed on the resolved leaf match id (not the pathname) with no router view transition, and links preload on viewport, because pathname keying replayed the fade on the old page before the new one loaded.
- Hero comparisons live in a standalone noindex, sitemap-excluded prerendered route without shared floating controls; they never modify the production homepage, so photo approval remains independent.
