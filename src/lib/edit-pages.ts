import { fleet, programs, specialtyCourses } from "./site-data";

/** Pages with editable slots, for the editor page menu and the admin Edit site tab. */
export const EDIT_PAGES: { label: string; path: string }[] = [
  { label: "Home", path: "/" },
  { label: "Programs", path: "/programs" },
  ...programs.map(p => ({ label: `Program · ${p.name}`, path: `/programs/${p.slug}` })),
  { label: "Specialized training", path: "/specialized-training" },
  ...specialtyCourses.map(c => ({ label: `Course · ${c.name}`, path: `/specialized-training/${c.slug}` })),
  { label: "Student success", path: "/student-success" },
  { label: "Fleet", path: "/fleet" },
  ...fleet.map(f => ({ label: `Airplane · ${f.registration}`, path: `/fleet/${f.registration.toLowerCase()}` })),
];
