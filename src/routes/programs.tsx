import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/programs")({ component: ProgramsLayout });
function ProgramsLayout(){return <Outlet/>}