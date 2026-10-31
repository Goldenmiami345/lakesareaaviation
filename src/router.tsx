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
  // while the visitor is already scrolling. Each new page still starts at the top,
  // gliding smoothly; any visitor scroll input cancels the glide immediately.
  router.subscribe("onResolved", (event) => {
    if (event.fromLocation && event.fromLocation.pathname !== event.toLocation.pathname) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  return router;
};
