# Model release held

`SHOW_3D_MODELS = false` in site-data gates every visitor model lookup and model-rendered map sprite. Public cards, fleet and fullscreen galleries retain cutout photos; supplied GLBs and exact viewer settings remain installed. SVG footprints return to legacy scale. Flip this one flag after replacing files and approval.

`/models-preview` alone bypasses the flag. Standalone, noindex/nofollow, no navigation links, sitemap excluded, explicitly prerendered with a heading/copy production guard. Model-viewer imports only after hydration and visibility; server HTML contains stable photo slots, never model-viewer.

Verified all three models loaded and accepted drag without page movement at 390×844 and 1280×900, no page errors; public Fleet has no model elements or 3D buttons. Six screenshots are in `/tmp/browser/models-hidden/` named by registration and viewport width. 28 focused model, paging, zoom, traffic and SSR-guard tests passed. Development server HTML passed the guard: home 72,704 bytes, fleet 110,416 bytes, preview 6,413 bytes. Latest automated check: build OK. Production prerender output/cache enforcement remain unverified until a hosted build; physical iPhone not tested. Scroll implementation and live hero unchanged.

Files: site-data.ts, aircraft-models.ts, model-settings.ts/test, traffic-vector.tsx, traffic-pattern.tsx, traffic-perspective.tsx, aircraft-media.tsx, models-preview.tsx, vite.config.ts, prerender-contracts.json, AGENTS.md, roadmap.md.