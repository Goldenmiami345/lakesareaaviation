# Roadmap

- [x] Stop mobile Story swipes and incoming momentum at one section boundary; 27 tests pass, phone preview holds the incoming swipe at flight-path and a fresh swipe reaches airports. Physical Safari momentum remains unverified.

- [x] Round L: supplied scroll engine and 18 tests, paging/snap/controller/scripts removed, zoom fast-path and oblique projection corrected. 144 tests, automatic build, model guard, fresh-preview 27-page HTML gate and native drag/wheel checks at 390×844/1440×900 passed. Production-output gate cannot be confirmed: dist/client is not provided by the automatic preview build; physical Safari not available.

- [x] Journeys: one screen of scroll per stage on desktop too (one upward swipe ≈ one stage), softer 700/800ms glides, no forced pull between sections, no photo jump when scrolling up; 155 tests, 21/21 smoothness transitions and phone checks pass.

- [x] Remove touchscreen upward stack drag with compact phone stages; measured 100px scroll now moves imagery 100px instead of 42px, 21/21 downward swipes and 154 tests pass.

- [x] Fix mobile journey background slivers; 21/21 one-swipe transitions pass at 360/390/402px, upward scrolling remains native, and 153 tests pass. Broader phone performance check still misses three timing targets; production prerender output is unavailable.

- [x] Tighten shared model camera framing; fleet widths 86.9–87.6% at 390×844/1280×800, 14 tests pass. Traffic slots reach 57–60%: their unchanged 80px height limits safe framing at 73° polar; 85% requires taller slots or a lower view.

- [x] Swap three owner cut-outs and remove originals page (404); fleet tests and 27-page fresh server HTML guard pass. Production-output gate still requires dist/client.

- [ ] Replace/enable three fleet and traffic-card models; preserve posters and isolated gestures.
- [ ] Replace Cardinal cut-out and add hidden full-resolution fleet originals page.
- [ ] Verify phone/desktop model motion, photo viewer, tests and page HTML; preserve walk-around assets.

- [x] Restore native journey boundaries; real-touch paging and stationary-mouse wheel/burst reversals pass.
- [x] Keep desktop aircraft cards open until pointer moves away; both views pass live checks.
- [x] Re-time traffic with circle-free elongated circuits; 104 tests and fresh 27-page server HTML guard pass.
- [ ] Verify production-output prerender gate for this round: dist/client is absent; automatic checks do not generate it.

- [x] Fix contact slash-dependent hydration; verify four pages using production React replay of the exact repair and updated preview.
- [x] Restore all three desktop airports to 1.15×; preserve phone 1.1029×/1.25×/1.25×.
- [x] Draw exact flight paths, collision-checked labels and stronger targets; six screenshots, 30 tests, 4× pinch and one-notch/native-up checks pass.
- [ ] Verify fresh production artifacts and deployed hydration after publish: no new dist/server output is available in this workspace; published-before and preview-after all-27 HTML guard checks pass.

- [x] Disable visitor models/sprites with one flag; add hidden prerendered models preview; verify 390×844/1280×900, 28 tests and dev SSR (production verification remains blocked below).

- [x] Install supplied GLBs and exact top sprites; verify three cards/fleet rotation/drag/pinch isolation and dev SSR; report production limitations.

- [x] Add production HTML gate for all 26 routes, fleet order and unfinished Suspense; validate gate against empty shell.
- [x] Confirm production SSR repair: owner verified deployment bd791aef returns complete server HTML; hydration follow-up tracked above.

- [x] Add Cardinal facts, source-pixel cutout, finger-free walk-around and KLXL rotation (fine alpha-edge limitations reported).
- [x] Fit airport default zoom to complete patterns and protected UI on phone/desktop (desktop targets cannot fit unchanged copy; actual reduced values reported).
- [x] Add lazy model-backed card/fleet media with isolated gestures and photo fallback; verify and report.

- [x] Replace retired Apache and correct Phoenix/order everywhere; update traffic paint and factual tests.
- [x] Inspect 35 owner photos; prepare seven exact-photo cutouts and optimized CDN walk-arounds (masking quality limitations recorded in the report).
- [x] Add real walk-around/fullscreen zoom and hidden-until-present lazy model slot; verify fleet and traffic on phone/desktop.
- [x] Verify supplied Phoenix, Apache and Cardinal GLBs load and render in fleet/cards at 390×844; physical iPhone performance unverified.

- [x] Contain airplane photos in a full-width top card area; verify four aircraft types at 375×667 and 390×844.

- [x] Stabilize traffic cards and verify alpha/margins; preserve hero, geometry, legacy footprint and gestures (Citabria thin-edge perfection still needs owner review).
- [x] Share type-specific vector traffic and radar targets/calls across aerial and oblique views.
- [x] Use wind-adjusted true-time speeds with tests; verify all four views at 390×844 and 4× zoom and report changes (physical iPhone unverified).

- [x] Create hidden prerendered hero comparison with protected-photo A/B, real-photo C and optional D; keep live hero unchanged.
- [x] Verify all hero options at 390×844 and 1280×900, report sizes and uncertain AI extensions.

- [x] Verify mobile journey exits, rounded step positions, and reduced-motion scrolling no longer trap swipes.

- [x] Reduce accidental homepage step skipping with longer reading windows; reverse the mobile dot to demonstrate an upward swipe.

- [x] One gesture = one stage: wheel bursts and swipes advance a single journey step and lock until the gesture settles.
- [x] Momentum catch-up: a fling that stops inside a pinned journey snaps to the nearest stage, so one swipe covers one page.
- [x] Replace built-in scroll restoration with explicit top-of-page resets on real navigations, so a late hydration settle can no longer yank a scrolling visitor to the top.

- [x] Rating detail upgrade (audit, research, timelines/prices, verify).
- [x] Flight path: Commercial stage added between Instrument and CFI & CFII (now 6 stages).
- [x] Scroll cues polished: centered ring with pulsing rust halo, kept the original concept.
- [x] Scroll cue replaced with mouse icon, orange dot centered; both flight-path sections use it.
- [x] Three-airport section: real USGS aerial photos (KLXL, 18V, P52), no AI imagery.
- [x] Single school phone 318-347-9004 everywhere; airport numbers removed.
- [x] Replace the existing orange accent token with royal blue; keep the design unchanged.
- [x] Refine the mobile home opening to feel lighter and less blocky, informed by ATP and Blue Line Aviation.
- [x] Improve blue accent text contrast across photographic and dark backgrounds.
- [x] Add secure `/admin` control for the site-wide royal blue/original orange theme.
- [x] Upgrade “Build my training plan” with earned/planned rating selection, minimum timeline and cost calculations, $30/night housing, $20/day car, and optional airport pickup.
- [x] Simplify scroll prompts to a standalone scrolling mouse on desktop and swipe gesture on mobile.
- [x] Restyle small photographic and active flight-step labels with blue fill and crisp white outlines.
- [x] Integrate the school’s real cockpit photos and video into the Instrument and CFI/CFII scroll stages, professionally finished for desktop and mobile.
- [x] Refine cockpit storytelling: preserve the school's real panel, add obvious IMC outside, and restore the wider instructor-aircraft scene for CFI/CFII.
- [x] Replace the repeated airport-journey finger with an understated mobile stroke cue.
- [x] Strengthen the airport handoff into a visible three-line mobile runway signal.
- [x] Add a concise post-locations section for commercial multi, MEI, endorsements, and flight reviews.
- [x] Simplify scroll guidance to a tiny bottom landing cue and animated right-edge journey line on mobile.
- [x] Home polish: one-notch paging, soft section edges, location shortcuts, back to top, readable labels, cockpit video, corrected KLXL runway, live FAA-based traffic pattern, nav flicker fix, 24-page audit.
- [ ] Publish the latest preview build (awaiting go-ahead).
- [ ] Inquiry form destination (where leads should be sent).
- [x] Confirm "1-hour oral · 1-hour flight" meaning: the advertised CFI/CFII exam format.
- [ ] Fresh security scan before wide sharing.

- [x] Clarify that “1-hour oral · 1-hour flight” describes the CFI/CFII exam, modernize its presentation, and simplify the mobile scroll cue.

- [x] Reduce the size of the "1"s in the "1 hour oral / 1 hour flight" line so they sit level with the words on phone and desktop.

- [x] Scroll-up unlock: after any upward scroll, downward paging and snapping stay off until the end of the locations journey; 164 tests pass.
- [x] Hero title: "BECOME A PROFESSIONAL PILOT", CTA and location chips centered as one group on phone and desktop; verified with screenshots.
