// Maps the `program` value a "Build my training plan" link passes to /contact onto the
// ratings preselected in the planner. Specialty courses select no rating and add a note instead.
import { specialtyCourses } from "./site-data";

const RATINGS: Record<string, string[]> = {
  "private pilot": ["private"], "accelerated private pilot": ["private"],
  "instrument rating": ["instrument"], "accelerated instrument rating": ["instrument"],
  "commercial single-engine": ["commercial-single"], "commercial single-engine land": ["commercial-single"],
  "commercial multi-engine": ["commercial-multi"], "commercial multi-engine land": ["commercial-multi"],
  "cfi & cfii": ["cfi", "cfii"],
  "certified flight instructor": ["cfi"],
  "certified flight instructor–instrument": ["cfii"],
  "multi-engine instructor": ["mei"], "multi-engine flight instructor": ["mei"],
};

/** Ratings to preselect, [] for a specialty course, or null to keep the planner default. */
export function plannedForProgram(program: string | undefined): string[] | null {
  if (!program) return null;
  const key = program.trim().toLowerCase();
  if (RATINGS[key]) return [...RATINGS[key]];
  return specialtyCourses.some((c) => c.name.toLowerCase() === key) ? [] : null;
}

/** Prefilled note for a specialty course link, "" otherwise. */
export function noteForProgram(program: string | undefined): string {
  const c = program ? specialtyCourses.find((x) => x.name.toLowerCase() === program.trim().toLowerCase()) : undefined;
  return c ? `I’m interested in ${c.name}.` : "";
}
