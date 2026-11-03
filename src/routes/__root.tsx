import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
  isNotFound,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeSync } from "../components/theme-sync";
import { canonicalUrl } from "../lib/site-url";
import { SiteLayout } from "../components/site-shell";
import { SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";

function NotFoundComponent() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-36 lg:px-8">
        <p className="eyebrow text-primary-text">404</p>
        <h1 className="mt-4 font-display text-5xl">Page not found</h1>
        <p className="mt-5 text-lg text-muted-foreground">That page doesn't exist or has moved. Try one of these instead:</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/programs" className="border border-border px-5 py-3 text-sm font-bold uppercase hover:border-primary">Programs</Link>
          <Link to="/fleet" className="border border-border px-5 py-3 text-sm font-bold uppercase hover:border-primary">Fleet</Link>
          <Link to="/rates" className="border border-border px-5 py-3 text-sm font-bold uppercase hover:border-primary">Rates</Link>
          <Link to="/contact" className="bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground">Build my training plan</Link>
        </div>
        <a href={SCHOOL_PHONE_TEL} className="mt-10 inline-flex font-display text-3xl text-primary-text">{SCHOOL_PHONE}</a>
      </section>
    </SiteLayout>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: ({ matches }) => {
    // Canonical/og:url live here only (single source; leaf routes never add one), for sitemap pages only.
    const canonical = canonicalUrl(matches[matches.length - 1] as Parameters<typeof canonicalUrl>[0]);
    // Unmatched URLs resolve to the root alone; a thrown notFound() lands on a match as its error.
    const notFound = matches.length === 1 || matches.some((m) => isNotFound((m as { error?: unknown }).error));
    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#151722" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: notFound ? "Page not found | Lakes Area Aviation" : "Lakes Area Aviation" },
      { name: "description", content: "Accelerated flight training and pilot ratings." },
      { name: "author", content: "Lakes Area Aviation" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(canonical ? [{ property: "og:url", content: canonical }] : []),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Fonts load without blocking first paint (hero text/LCP); the script in RootShell attaches the stylesheet.
      { rel: "preload", as: "style", href: FONT_CSS },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      ...(canonical ? [{ rel: "canonical", href: canonical }] : []),
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const FONT_CSS = "https://fonts.googleapis.com/css2?family=Andada+Pro:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap";

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONT_CSS)};document.head.appendChild(l)})()` }} />
        <noscript><link rel="stylesheet" href={FONT_CSS} /></noscript>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a href="#main" className="skip-link">Skip to content</a>
      <ThemeSync />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
