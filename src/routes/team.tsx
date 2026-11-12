import { createFileRoute, redirect } from "@tanstack/react-router";

// The team now lives on About (owner request: one fewer menu item). Old /team links keep working.
export const Route = createFileRoute("/team")({
  staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/about", hash: "team", statusCode: 301 }); },
});
