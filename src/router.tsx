import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    trailingSlash: "preserve",
    defaultPreloadStaleTime: 0,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  // Scroll management is handled here instead of the built-in scrollRestoration:
  // its reset can fire from a late hydration settle and yank the page to the top
  // while the visitor is already scrolling. A new page jumps to the top instantly
  // just before it mounts, so visitors never see the old page glide or flash.
  router.subscribe("onBeforeRouteMount", (event) => {
    if (event.fromLocation && event.fromLocation.pathname !== event.toLocation.pathname) {
      document.documentElement.classList.remove("journey-snap");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  });

  return router;
};
