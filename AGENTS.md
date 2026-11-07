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
- Bundled photos: WebP, max 2560px, never above source; srcset via responsive-image.ts.
- The global accent theme is read from the public site_settings row; only a database-verified admin role may change it.
- Scroll-journey stages may use optimized CDN video with a real-photo poster; video plays only while its stage is active to protect mobile performance.
- Both homepage journeys use journey-scroll.ts: native input, scrollY-driven crossfades, cached geometry, hold-only stageLanding links and bounded crossfade-only settling; never restore paging, scroll-snap, input interception or Lenis because they ate gestures.
- Scroll management is explicit in src/router.tsx (instant top-of-page reset on real navigations via onBeforeRouteMount, so the old page never glides or flashes); never re-enable TanStack's built-in scrollRestoration — its reset can fire from a late hydration settle and yank a scrolling visitor to the top.

- Airport geometry remains in USGS pixel space from FAA data; traffic-flight.ts integrates per-type, wind-corrected real-time speed separately, so map movement and card ground speed agree without changing pattern corners.
- Airport maps plot all geolocated live reports within the existing viewBox; only visible pattern-qualified reports replace simulated traffic, so overflights remain visible without being mistaken for pattern traffic. Do not duplicate aircraft in a journey HUD summary.
- Both traffic views share traffic-vector: supplied top renders use literal meter wingspans, other SVGs retain legacy scale; oblique axes use its calibrated camera.
- Traffic airplanes (aerial and oblique views) share selection, radar tags and the info card from src/components/traffic-ui.tsx so tap/hover behaviour stays identical everywhere.
- Stage zoom keeps single-finger scrolling passive; arm non-passive touchmove only for pinch/zoomed panning so native scrolling stays on the compositor fast path.
- All runtime 3D uses site_settings.show_3d_models, default false, read after mount with fail-closed lazy imports; no preview bypass. Fleet never renders 3D (owner). Retain model sources and baked traffic images. Traffic cards start models on open; other media at ≥50% view after idle, one at a time; all preserve isolated gestures and photo fallbacks.
- AirportScene shares one USGS image/traffic viewBox; phone framing uses the protected rectangle, desktop searches centroid placements around actual text/CTA/HUD/rail boxes rather than excluding the whole lower band, so zoom can increase without hiding aircraft. Stage-zoom remains independent.
- Training-plan leads are saved via the public submitTrainingLead server function (publishable client, insert-only RLS, admin-only reads, hashed-IP rate limit via recent_lead_count) so no lead depends on email delivery.
- Aerial runway selection uses live METAR with FAA/calm fallback; the photo-calibrated oblique runway remains 13. Both views share use-traffic-animation.ts for leg-entry calls, targets and live card values, so collision/reduced-motion behavior cannot drift.
- Weather→traffic logic is pure in wx-conditions.ts; live METAR renders only after mount in reserved slots (no weather in prerendered HTML).
- Journey stages zoom in-stage (stage-zoom.ts transforms .journey-zoom, overlays included); touch-action owns pinch/panning and journey-zoomed pauses settling so gestures stay isolated.
- Light surfaces (cards, popovers/menus) read the single --surface-light token in src/styles.css (beige color trial, see docs/color-trial-beige-2026-10-31.md for values and the one-line revert), so the trial is reversible in one place.
- Page changes have exactly one animation: the CSS page-enter in SiteLayout keyed on the resolved leaf match id (not the pathname) with no router view transition, and links preload on viewport, because pathname keying replayed the fade on the old page before the new one loaded.
- Browser-only libs (model-viewer) load only behind import.meta.env.SSR guards, never in the server bundle (a shared chunk once blanked all SiteShell pages); never import.meta.glob public/ files. `build` runs scripts/check-prerender-dist.mjs to fail on pages missing heading/copy (Lovable forces failOnError off).
- GLBs (public/models, uppercase regs, _headers, versioned ?v=) are meshopt+WebP, error-capped simplify, ≤900KB; shared model-settings owns camera/light/span and mesh-sphere/aspect fitting for fleet/traffic slots; load/resize fit the rotation envelope and reset restores it. Keep walk-around pointers/CDN objects; Apache banner stays unchanged.
- Hero comparisons stay separate, noindex, sitemap-excluded, without floating controls. Home uses Pixel Perfect Snapshot sunset assets: tall below 3:2 viewport aspect, wide otherwise, avoiding AI-redrawn planes.
- Normalize route pathnames with sitePath before shell visibility decisions: prerender visits slash-suffixed URLs while browser navigation often does not, and differing action-bar trees cause hydration failure.
- The drawn pattern (TrafficPath) follows site_settings.traffic_pattern_mode (off/pulse/always), read after mount so prerendered HTML never depends on it; pulse pauses while a card is open and never runs in reduced motion.
- USE_RENDERED_TOP_SPRITES (site-data) draws photo-derived top renders (src/assets/fleet/top, width = wingspan) for those registrations in the aerial view only, at the vectors' ~3x display scale (full 640px source) with an alpha-derived shadow; the oblique view uses model-baked heading sprites and other registrations keep SVG vectors.
- Airport imagery mounts within 1.5 viewports or on a "journey-target" glide event, phone or desktop aerial only (first-load weight). Models spin only when visible.

- Subdirectories have their own AGENTS.md (src/components) to read before changing files there.- Canonical/og:url are emitted only by the root head from src/lib/site-url.ts (SITE_URL + leaf fullPath, sitemap routes only; sitemap uses the same constant), so leaf routes never add their own and the domain switch is one line.
- Scroll-reveal hidden states apply only under html.reveal-ready (added by MotionExperience after hydration, in-view targets marked visible first), so prerendered/no-JS HTML is always fully visible. SiteLayout owns the single <main id="main">; routes use plain divs inside it.
- Accent TEXT uses text-primary-text (--primary-text on light, --primary-text-dark inside bg-ink/text-background, per accent theme); fills/buttons keep --primary, because the brand blue fails AA as text on beige and ink.

- Every link to the contact/training-plan form is labelled "Build my training plan" (sticky bar: "Build my plan"); distinct actions keep their own labels, so one name always means one destination.
- Seams between navy, blue and beige are clean edges (edge-fade no-ops): navy/beige blends go grey.
- Layout width uses site-container/site-wrap and --gutter (styles.css), never max-w-7xl, so header, sections and journey HUD/rail share one edge.
- ALT readout: journeyAltitude; wind: nearest METAR (wx-stations.ts), wxStation fallback.
- Phone Story section boundaries are native CSS scroll snap (story-snap.ts, phone Story mode only, the one scroll-snap exception); never drive vertical story movement from script, because it made slides uneven on iPhone.
- Story coachmarks share timing constants in story-nav.ts and stay pointer-transparent; each journey owns its first-arrival state so hints cannot block gestures or repeat on stage changes.

- Netlify: netlify.toml + NETLIFY-only @netlify/vite-plugin-tanstack-start with nitro off in vite.config.ts (nitro's netlify preset breaks prerender); keep Lovable default intact.
