import { fleet, programs, specialtyCourses } from "./site-data";

/** Every public page, for the editor page menu and the admin Edit site tab. */
export const EDIT_PAGES: { label: string; path: string }[] = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/services" },
  { label: "Programs", path: "/programs" },
  ...programs.map(p => ({ label: `Program · ${p.name}`, path: `/programs/${p.slug}` })),
  { label: "Accelerated training", path: "/accelerated-training" },
  { label: "Specialized training", path: "/specialized-training" },
  ...specialtyCourses.map(c => ({ label: `Course · ${c.name}`, path: `/specialized-training/${c.slug}` })),
  { label: "Local training", path: "/local-training" },
  { label: "Introductory flights", path: "/introductory-flights" },
  { label: "Scenic flights", path: "/scenic-flights" },
  { label: "Fleet", path: "/fleet" },
  ...fleet.map(f => ({ label: `Airplane · ${f.registration}`, path: `/fleet/${f.registration.toLowerCase()}` })),
  { label: "Rates", path: "/rates" },
  { label: "Students", path: "/students" },
  { label: "New students", path: "/new-students" },
  { label: "Student success", path: "/student-success" },
  { label: "About & Team", path: "/about" },
  { label: "Locations", path: "/locations" },
  { label: "Build my training plan", path: "/contact" },
];

export type PageGroup = { name: string; pages: { label: string; path: string }[] };
const GROUPS: [prefix: string, name: string][] = [["Program · ", "Training programs"], ["Course · ", "Specialty courses"], ["Airplane · ", "Airplanes"]];
/** Main pages first, then programs, courses and airplanes, each without its "Program · " style prefix. */
export function groupPages(pages: { label: string; path: string }[]): PageGroup[] {
  const out: PageGroup[] = [{ name: "Main pages", pages: [] }, ...GROUPS.map(([, name]) => ({ name, pages: [] as PageGroup["pages"] }))];
  for (const p of pages) {
    const gi = GROUPS.findIndex(([prefix]) => p.label.startsWith(prefix));
    out[gi + 1]!.pages.push(gi < 0 ? p : { ...p, label: p.label.slice(GROUPS[gi]![0].length) });
  }
  return out.filter(g => g.pages.length);
}
