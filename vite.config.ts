// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { verifyPrerender } from './scripts/verify-prerender';

// Netlify builds (NETLIFY=true) use Netlify's own TanStack Start plugin instead of nitro, because
// nitro's netlify preset has no fetch entry the prerender step can load. Lovable hosting keeps its default.
const onNetlify = process.env["NETLIFY"] === "true";
const netlifyPlugins = onNetlify
  ? [(await import("@netlify/vite-plugin-tanstack-start")).default()]
  : [];

export default defineConfig({
  ...(onNetlify ? { nitro: false as const, vite: { plugins: netlifyPlugins } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: [
      "/", "/about", "/accelerated-training", "/admin", "/contact", "/fleet", "/hero-options", "/models-preview", "/introductory-flights",
      "/local-training", "/locations", "/new-students", "/programs", "/rates", "/scenic-flights",
      "/specialized-training", "/student-success", "/services", "/students",
      ...["private-pilot", "instrument-rating", "commercial-single-engine", "commercial-multi-engine", "cfi-cfii", "mei", "zero-to-hero"].map((s) => `/programs/${s}`),
      // One page per airplane (lowercase tail number); keep in sync with fleet in src/lib/site-data.ts.
      ...["n8570b", "n4383p", "n46201", "n6717a", "n6641f", "n96150", "n11059", "n7108g"].map((r) => `/fleet/${r}`),
    ].map((path) => ({ path })),
    prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false, autoSubfolderIndex: false, failOnError: true, onSuccess: verifyPrerender },
  },
});
