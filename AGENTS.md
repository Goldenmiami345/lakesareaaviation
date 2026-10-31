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
- Journey paging is section-scoped (sectionStep in journey-pacing.ts): one swipe/notch = one stage only between stages of the same journey; entering or leaving a journey is plain native scrolling with no completion, spring-back or exit clamp, and settling snaps only when scroll rests inside a journey's span (it then fills the screen). A journey's last stop sits at the end of its pinned stretch so exiting has no dead length. No ink fade overlays on journey entry/exit, so the incoming image is always visible mid-scroll. Programmatic jumps use glideTo.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport traffic patterns are drawn in each USGS aerial's pixel space from FAA airport data kept in site-data (elevation, pattern altitude, runway, direction), so altitudes and pattern sides stay factual; geometry is pure and tested in traffic-pattern.ts; airplanes move at real leg speeds scaled from published runway length and use top-down renders made from each real fleet photo.- The Private Pilot oblique photo gets its own traffic overlay: the pattern is computed in a local runway frame and projected into the photo by a homography in src/lib/oblique-view.ts (tested), using three-quarter cut-outs of real fleet photos, so the oblique view and the aerials share one pattern model.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Journey touch paging freezes native scroll during its glide (html.journey-paging), disables scroll anchoring, and pulls leftover native deltas back onto the landed page; a finger with no touch events for 150ms counts as lifted because touchend can be dropped under load.
- Fleet cards use native <details> accordions so all specs stay in prerendered HTML; the full-screen aircraft viewer is a lazy, body-portaled chunk showing real photos until accurate per-tail 3D models exist.
- Training-plan leads are saved via the public submitTrainingLead server function (publishable client, insert-only RLS, admin-only reads, hashed-IP rate limit via recent_lead_count) so no lead depends on email delivery.
- Airport traffic shows CTAF-style callouts only on leg entry (one per airport at a time) and flies the runway end chosen from live METAR wind (cached /api/public/metar, fetched after hydration); without weather it uses the FAA/calm-wind runway and hides the wind readout, so no made-up wind is ever shown.
- Journey stages zoom in-stage (src/lib/stage-zoom.ts transforms each layer's .journey-zoom wrapper, overlays included); the stage owns pinch/double-tap via touch-action, html.journey-zoomed pauses paging, and any multi-touch gesture cancels paging so pinches never page.
