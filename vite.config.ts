// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { verifyPrerender } from './scripts/verify-prerender';
import { netlifyPrerenderShim } from './scripts/netlify-prerender-shim';

export default defineConfig({
  // Netlify builds (NETLIFY=true) emit Netlify functions; Lovable hosting keeps its default.
  // netlifyPrerenderShim points the prerender preview at nitro's Netlify handler (Lovable's shim only knows index.mjs).
  ...(process.env["NETLIFY"] === "true" ? { nitro: { preset: "netlify" }, plugins: netlifyPrerenderShim() } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: [
      "/", "/about", "/accelerated-training", "/admin", "/contact", "/fleet", "/hero-options", "/models-preview", "/introductory-flights",
      "/local-training", "/locations", "/new-students", "/programs", "/rates", "/scenic-flights",
      "/specialized-training", "/student-success", "/team", "/services", "/students",
      ...["private-pilot", "instrument-rating", "commercial-single-engine", "commercial-multi-engine", "cfi-cfii", "mei", "zero-to-hero"].map((s) => `/programs/${s}`),
    ].map((path) => ({ path })),
    // crawlLinks off + autoSubfolderIndex on mirror what the Lovable build pins, so Netlify builds
    // prerender only the pages list and write <route>/index.html (what check-prerender-dist expects).
    prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false, autoSubfolderIndex: true, failOnError: true, onSuccess: verifyPrerender },
  },
});
