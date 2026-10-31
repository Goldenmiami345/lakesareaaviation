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
- Journey one-page-per-swipe uses native mandatory scroll-snap stops (scroll-snap-stop: always). Snap is never switched on mid-scroll: entering the first/last-page range only arms it, and it engages after scrolling settles (no finger down) or on a fresh wheel gesture, because toggling mandatory snap mid-scroll caused sudden jumps. Leaving the range, or an outward input at either end, switches it off immediately and the exit wheel delta is applied by hand (Chromium re-snaps a native wheel scroll that began while snapping). Wheel input entering from a corridor clamps on the edge page. Wheel stepping uses a fixed, never-extending lock (an extending lock once froze the page). Programmatic jumps use glideTo, which suspends snapping.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport traffic patterns are drawn in each USGS aerial's pixel space from FAA airport data kept in site-data (elevation, pattern altitude, runway, direction), so altitudes and pattern sides stay factual; geometry is pure and tested in traffic-pattern.ts; airplanes move at real leg speeds scaled from published runway length and use top-down renders made from each real fleet photo.- The Private Pilot oblique photo gets its own traffic overlay: the pattern is computed in a local runway frame and projected into the photo by a homography in src/lib/oblique-view.ts (tested), using three-quarter cut-outs of real fleet photos, so the oblique view and the aerials share one pattern model.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
