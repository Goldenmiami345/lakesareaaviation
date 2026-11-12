import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { backRestoreHistory, backRestoreLeave, backRestoreResolved, installBackRestore, restoringPath } from "./lib/back-restore";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    trailingSlash: "preserve",
    defaultPreloadStaleTime: 0,
    // Phones have no hover: preload route code for every link as soon as it is on screen
    // (header, footer, mobile menu), so a tapped page is ready instantly.
    defaultPreload: "viewport",
    defaultPreloadDelay: 0,
    // No view transition: the CSS page-enter fade in SiteLayout is the ONE page-change animation.
  });

  // Scroll management is handled here instead of the built-in scrollRestoration:
  // its reset can fire from a late hydration settle and yank the page to the top
  // while the visitor is already scrolling. A new page jumps to the top instantly
  // just before it mounts, so visitors never see the old page glide or flash.
  // Back/forward buttons return to the exact spot (homepage: same section and story page), see back-restore.ts.
  if (typeof window !== "undefined") {
    installBackRestore();
    router.history.subscribe(({ location, action }) => backRestoreHistory(location.state, location.pathname, action.type));
    router.subscribe("onBeforeNavigate", () => backRestoreLeave());
    router.subscribe("onResolved", (event) => backRestoreResolved(event.toLocation.state));
  }
  router.subscribe("onBeforeRouteMount", (event) => {
    if (typeof document === 'undefined') return;
    if (event.fromLocation && event.fromLocation.pathname !== event.toLocation.pathname) {
      if (event.toLocation.hash) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  });
  // Links with a #hash (e.g. a tail number on Fleet) land on that spot in one
  // instant jump once the page is in place, never a second visible scroll.
  router.subscribe("onResolved", (event) => {
    if (typeof document === 'undefined') return;
    const hash = event.toLocation.hash;
    if (!hash || event.fromLocation?.href === event.toLocation.href || restoringPath(event.toLocation.pathname)) return;
    const land = () => document.getElementById(hash)?.scrollIntoView({ behavior: "instant", block: "start" });
    if (document.getElementById(hash)) land(); else requestAnimationFrame(land);
  });

  return router;
};
