import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/programs")({
  staticData: { sitemap: false }, component: ProgramsLayout });
function ProgramsLayout(){return <Outlet/>}