import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";
import { fleet, programs, specialtyCourses } from "@/lib/site-data";

import { SITE_URL as BASE_URL } from "@/lib/site-url";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        // Program detail pages are code-backed in src/lib/site-data.ts.
        const routeId = "/programs/$slug";
        if (isSitemapRouteIncluded(router.routesById[routeId])) {
          for (const program of programs) {
            const location = router.buildLocation({
              to: "/programs/$slug",
              params: { slug: program.slug },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, routeId);
            if (path) entries.push({ path });
          }
        }

        // Airplane pages, one per fleet entry (/fleet/n8570b).
        const fleetRouteId = "/fleet_/$reg";
        if (isSitemapRouteIncluded(router.routesById[fleetRouteId])) {
          for (const plane of fleet) {
            const location = router.buildLocation({
              to: "/fleet/$reg",
              params: { reg: plane.registration.toLowerCase() },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, fleetRouteId);
            if (path) entries.push({ path });
          }
        }

        // Endorsement and specialty course pages (/specialized-training/tailwheel).
        const specialtyRouteId = "/specialized-training_/$slug";
        if (isSitemapRouteIncluded(router.routesById[specialtyRouteId])) {
          for (const course of specialtyCourses) {
            const location = router.buildLocation({
              to: "/specialized-training/$slug",
              params: { slug: course.slug },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, specialtyRouteId);
            if (path) entries.push({ path });
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
