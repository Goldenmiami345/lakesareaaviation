import n6717aImage from "../assets/fleet/n6717a.webp";
import n8570bImage from "../assets/fleet/n8570b.webp";
import n6641fImage from "../assets/fleet/n6641f.webp";
import n96150Image from "../assets/fleet/n96150.webp";
import n11059Image from "../assets/fleet/n11059.webp";
import n7108gImage from "../assets/fleet/n7108g.webp";
import n3353pImage from "../assets/fleet/n3353p.webp";
import n3353pPanel from "../assets/fleet/n3353p-panel.png.asset.json";
import n6641fPanel from "../assets/fleet/n6641f-panel.png.asset.json";
import n6717aPanel from "../assets/fleet/n6717a-panel.png.asset.json";
import n7018gPanel from "../assets/fleet/n7018g-panel.png.asset.json";
import n8570bPanel from "../assets/fleet/n8570b-panel.png.asset.json";

export type Program = {
  slug: string;
  name: string;
  short: string;
  description: string;
  details: string[];
  sourceLabel: string;
  sourceUrl: string;
  options: {
    name: string;
    timeline: string;
    estimatedCost: string;
    lineItems: string[];
    requirements: string[];
  }[];
  steps?: { name: string; cost: string; description: string }[];
  notes: string[];
};

export const programs: Program[] = [
  {
    slug: "private-pilot", name: "Private Pilot", short: "Start flying", description: "Build the foundation for every rating that follows with concentrated ground and flight instruction.", details: ["40 hours Cessna 172 rental", "30 hours dual instruction", "10 hours one-on-one ground school"], sourceLabel: "2026 Private Pilot estimated rates", sourceUrl: "https://www.lakesareaaviation.com/private-pilot",
    options: [{ name: "Accelerated Private Pilot", timeline: "As little as 21 days", estimatedCost: "As low as $9,600", lineItems: ["40 hours Cessna 172 rental at $175/hr — $7,000", "30 hours dual instruction at $60/hr — $1,800", "10 hours one-on-one ground school at $60/hr — $600", "Ground-school course: King Schools $219, Sporty’s $200, or ASA $129", "FAA medical estimate — $100"], requirements: ["FAA medical is required before solo flight", "Written test must be complete before the practical test", "Finish the required flight and ground training and receive an instructor endorsement"] }],
    notes: ["The medical and written test do not need to be complete before training begins.", "Examiner fees are additional and aircraft rental is subject to tax."]
  },
  {
    slug: "instrument-rating", name: "Instrument Rating", short: "Fly with precision", description: "Develop the skills and judgment to operate safely by reference to instruments.", details: ["30 hours Cessna 172 rental", "15 hours flight instruction", "10 hours simulator training with instructor"], sourceLabel: "2026 Instrument estimated rates", sourceUrl: "https://www.lakesareaaviation.com/instrument-rating-1",
    options: [{ name: "Accelerated Instrument Rating", timeline: "10–14 days", estimatedCost: "As low as $8,300", lineItems: ["Course fee — $500", "30 hours Cessna 172 rental at $175/hr — $5,250", "15 hours flight instruction at $60/hr — $900", "10 hours ground instruction at $60/hr — $600", "10 hours simulator rental, including instructor, at $105/hr — $1,050"], requirements: ["Private Pilot certificate", "The school recommends arriving with the written test complete", "The school’s career-path outline notes 40–50 hours of flight time are required"] }],
    notes: ["Examiner fees are additional and subject to change.", "Aircraft rental is subject to tax."]
  },
  {
    slug: "commercial-single-engine", name: "Commercial Single-Engine", short: "Fly professionally", description: "Advance your flying to commercial standards through concentrated maneuver, ground, and practical-test preparation.", details: ["15 hours Cessna 172 rental", "15 hours flight instruction", "10 hours ground instruction"], sourceLabel: "2026 Commercial Single Engine Land estimated rates", sourceUrl: "https://www.lakesareaaviation.com/commercial-single-engine",
    options: [{ name: "Commercial Single-Engine Land", timeline: "5–7 days", estimatedCost: "As low as $4,625", lineItems: ["Course fee — $500", "15 hours Cessna 172 rental at $175/hr — $2,625", "15 hours flight instruction at $60/hr — $900", "10 hours ground instruction at $60/hr — $600"], requirements: ["Meet the required flight-hour totals before the checkride", "Complete the commercial written test before the checkride"] }],
    notes: ["This estimate prices the concentrated commercial course, not the time-building needed to reach commercial eligibility.", "Examiner fees are additional and aircraft rental is subject to tax."]
  },
  {
    slug: "commercial-multi-engine", name: "Commercial Multi-Engine", short: "Add multi-engine", description: "Train for commercial multi-engine privileges in Lakes Area Aviation’s Piper Apache.", details: ["10 hours Piper Apache rental", "10 hours multi-engine instruction", "4 hours ground school"], sourceLabel: "2026 Commercial Multi Engine Land estimated rates", sourceUrl: "https://www.lakesareaaviation.com/commercial-multi-engine",
    options: [{ name: "Commercial Multi-Engine Land", timeline: "3–4 days", estimatedCost: "As low as $5,300", lineItems: ["Course fee — $500", "10 hours Piper Apache rental at $375/hr — $3,750", "10 hours multi-engine instruction at $75/hr — $750", "4 hours ground school at $75/hr — $300"], requirements: ["Training is normally scheduled in two-hour blocks", "The instructor has a 1.6-hour minimum per two-hour block; unused flight time may be used for ground school"] }],
    notes: ["Examiner fees are additional and aircraft rental is subject to tax."]
  },
  {
    slug: "cfi-cfii", name: "CFI & CFII", short: "Instructor ratings", description: "Choose an accelerated initial flight-instructor course, add instrument-instructor privileges, or plan both ratings back to back.", details: ["Separate CFI and CFII course estimates", "Daily concentrated flight and ground training", "Checkride-focused preparation"], sourceLabel: "2026 CFI and CFI-I estimated rates", sourceUrl: "https://www.lakesareaaviation.com/cfi",
    options: [
      { name: "Certified Flight Instructor", timeline: "7–10 days", estimatedCost: "As low as $5,125", lineItems: ["Course fee — $1,000", "10 hours ground instruction at $60/hr — $600", "15 hours Cessna 172 rental at $175/hr — $2,625", "15 hours flight instruction at $60/hr — $900"], requirements: ["Plan for lessons in two-hour blocks", "Arrive ready for concentrated ground, flight, oral, and practical-test preparation"] },
      { name: "Certified Flight Instructor–Instrument", timeline: "5–7 days", estimatedCost: "As low as $3,150", lineItems: ["Course fee — $500", "10 hours Cessna 172 rental at $175/hr — $1,750", "10 hours flight instruction at $60/hr — $600", "5 hours ground instruction at $60/hr — $300"], requirements: ["Designed as an instrument-instructor add-on", "Plan for concentrated ground, flight, oral, and practical-test preparation"] }
    ],
    notes: ["Andrew Cashen reported completing his CFI training and checkride in 10 days, then finishing CFI-I in a total of 12 days. Individual timelines vary.", "Examiner fees are additional and aircraft rental is subject to tax."]
  },
  {
    slug: "mei", name: "Multi-Engine Instructor", short: "Teach in twins", description: "Add multi-engine instructor privileges in the Piper Apache through a short, concentrated course.", details: ["8 hours Piper Apache rental", "8 hours flight instruction", "4 hours ground instruction"], sourceLabel: "2026 Multi Engine Flight Instructor estimated rates", sourceUrl: "https://www.lakesareaaviation.com/mei",
    options: [{ name: "Multi-Engine Flight Instructor", timeline: "3–4 days", estimatedCost: "As low as $4,475", lineItems: ["Course fee — $500", "8 hours Piper Apache rental at $375/hr — $3,000", "8 hours flight instruction at $75/hr — $600", "4 hours ground instruction at $75/hr — $300"], requirements: ["Must have 15 hours pilot-in-command time in multi-engine aircraft"] }],
    notes: ["Examiner fees are additional and aircraft rental is subject to tax."]
  },
  {
    slug: "zero-to-hero", name: "Zero to Hero", short: "Professional pilot path", description: "See the complete sequence Lakes Area Aviation publishes for progressing from no flight time toward professional flying.", details: ["Six clearly defined stages", "Published budgeting estimates", "Instructor and non-instructor career paths"], sourceLabel: "Lakes Area Aviation Zero-to-Hero roadmap", sourceUrl: "https://www.lakesareaaviation.com/zero-to-hero",
    options: [{ name: "Complete career-path estimate", timeline: "Built around your starting point", estimatedCost: "Approximately $40,000", lineItems: ["Private Pilot — approximately $10,000", "Instrument Pilot — approximately $9,000", "Time and experience building — approximately $9,600", "Commercial Pilot — approximately $5,000", "Flight Instructor — approximately $5,000", "Airline Transport Pilot — described by the school as employer-paid"], requirements: ["The sequence and cost change with prior experience, pace, and additional ratings", "Most students need 1,500 total hours before the Airline Transport Pilot stage"] }],
    steps: [
      { name: "Private Pilot", cost: "About $10,000", description: "Complete student-pilot paperwork, medical, written test, flight and ground training, instructor endorsement, and the practical exam." },
      { name: "Instrument Pilot", cost: "About $9,000", description: "Begin after private pilot; complete the written test and the required instrument flight experience." },
      { name: "Time & experience building", cost: "About $9,600", description: "Build meaningful experience toward commercial eligibility. The school discusses splitting eligible flight time with another pilot to control cost." },
      { name: "Commercial Pilot", cost: "About $5,000", description: "Plan for roughly 10–20 hours of focused flight training plus the written and practical tests." },
      { name: "Flight Instructor", cost: "About $5,000", description: "Prepare to teach and use instructing as one route to build professional flight time." },
      { name: "Airline Transport Pilot", cost: "Employer-paid", description: "The school describes this as the final stage after building the required professional flight experience." }
    ],
    notes: ["The original school page says students can expect to spend close to $40,000 for flight training, ground training, checkrides, and related costs.", "These are planning estimates, not fixed-price guarantees."]
  },
];

export const testimonials = [
  { quote: "I had a great experience with Lakes Area Aviation. They helped me complete CFI training and checkride in 10 days, in mid January! I went back up a couple months later and finished CFI-I in a total of 12 days!", name: "Andrew Cashen", detail: "Accelerated CFI & CFI-I student" },
  { quote: "There were plenty of options for housing, transportation, and excellent service. I finished my rating and would highly recommend checking them out!", name: "Brian Pinkney", detail: "Private pilot student" },
  { quote: "The instruction is top-quality, delivered by experienced and supportive instructors. The entire staff is warm and welcoming.", name: "Kevin Bounda", detail: "Commercial single & multi-engine student" },
];

// Single school line — airport numbers are intentionally not listed.
export const SCHOOL_PHONE = "318-347-9004";
export const SCHOOL_PHONE_TEL = "tel:3183479004";

export const locations = [
  { city: "Little Falls, Minnesota", airport: "Little Falls/Morrison County Airport · KLXL", address: "13129 Airport Rd, Little Falls, MN 56345" },
  { city: "Fort Lupton, Colorado", airport: "Platte Valley Airpark · 18V", address: "7507 Co Rd 39, Fort Lupton, CO 80621" },
  { city: "Cottonwood, Arizona", airport: "Cottonwood Municipal Airport · P52", address: "1001 W Mingus Avenue, Cottonwood, AZ 86326" },
];

export type FleetRole = "trainer" | "twin" | "tailwheel";
// Rental rates are the published wet rates on /rates (regular, then prepay).
export const fleet: Array<{ name: string; registration: string; role: FleetRole; rate?: string; prepay?: string; nickname: string; use: string; note: string; image: string; position: string; panel?: string; specs?: Record<string, string> }> = [
  { name: "1956 Cessna 172", registration: "N6717A", role: "trainer" as FleetRole, rate: "$185/hr", prepay: "$175/hr", nickname: "Blue", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n6717aImage, position: "center", panel: n6717aPanel.url, specs: { Year: "1956", Horsepower: "145", "IFR/VFR": "VFR", Seats: "4", Coms: "4", GPS: "GPSMap 496", Equipment: "ADS-B out, Mode C transponder" } },
  { name: "1957 Cessna 172", registration: "N8570B", role: "trainer" as FleetRole, rate: "$185/hr", prepay: "$175/hr", nickname: "Phoenix", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n8570bImage, position: "center", panel: n8570bPanel.url, specs: { Year: "1956", Horsepower: "145", "IFR/VFR": "IFR", Seats: "4", Coms: "4", GPS: "Garmin 430, G5", Equipment: "ADS-B out, Mode C transponder" } },
  { name: "1966 Cessna 150", registration: "N6641F", role: "trainer" as FleetRole, rate: "$125/hr", prepay: "$115/hr", nickname: "Elliott", use: "Primary training", note: "Efficient time-building and foundational instruction.", image: n6641fImage, position: "center", panel: n6641fPanel.url, specs: { Year: "1966", Horsepower: "100", "IFR/VFR": "VFR", Seats: "2", Coms: "2", GPS: "GPSMap 496", Equipment: "Stratus" } },
  { name: "1946 Taylorcraft BC-12D", registration: "N96150", role: "tailwheel" as FleetRole, rate: "$135/hr", prepay: "$125/hr", nickname: "Tweety", use: "Tailwheel training", note: "Classic stick-and-rudder skill development.", image: n96150Image, position: "center", specs: { Year: "1946", Horsepower: "100", "IFR/VFR": "VFR", Seats: "2", Coms: "2" } },
  { name: "1965 Champion 7ECA", registration: "N11059", role: "tailwheel" as FleetRole, nickname: "Citabria", use: "Specialized training", note: "Tailwheel and specialized flight experience.", image: n11059Image, position: "center" },
  { name: "1970 Cessna 172K", registration: "N7108G", role: "trainer" as FleetRole, rate: "$185/hr", prepay: "$175/hr", nickname: "Hawk", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n7108gImage, position: "center", panel: n7018gPanel.url, specs: { Year: "1969", Horsepower: "150", "IFR/VFR": "IFR", Seats: "4", Coms: "4", GPS: "Garmin 375, G5", Equipment: "ADS-B out & in, Mode C transponder" } },
  { name: "1958 Piper Apache", registration: "N3353P", role: "twin" as FleetRole, rate: "$395/hr", prepay: "$375/hr", nickname: "Tot", use: "Multi-engine training", note: "Twin-engine systems, procedures, and commercial training.", image: n3353pImage, position: "center", panel: n3353pPanel.url, specs: { Year: "1970", Horsepower: "160/engine", "IFR/VFR": "IFR", Seats: "4", Coms: "4", GPS: "G430", Equipment: "ADS-B out, Mode C transponder" } },
];
// Traffic-pattern data from FAA airport records (NASR via AirNav, effective 2026-10-29):
// pattern direction and true heading for both main-runway ends. P52 publishes RWY 32 as its
// calm-wind runway with right traffic; KLXL and 18V publish none, so the school's usual runway is used.
// wxStation: own METAR (KLXL) or nearest reporting station (KDEN 16 nm for 18V, KSEZ 14 nm for P52).
// field elevation, pattern altitude, active runway and pattern direction.
// Runway endpoints are measured on each USGS aerial (1500 x 1500 px).
export const airportTraffic = {
  // Runway ends are the FAA NASR (effective 2026-10-29) end coordinates projected
  // with Web Mercator into each 1500 px USGS NAIP aerial, which is centred on the runway midpoint.
  KLXL: { ident: "KLXL", elevation: 1123, tpaAgl: 1000, runway: "13", runwayFt: 4010, side: "left", threshold: { x: 595, y: 617 }, end: { x: 905, y: 883 }, offset: 126, extension: 65, aircraft: ["N6717A", "N8570B", "N3353P", "N6641F"], ends: [{ runway: "13", side: "left", trueHdg: 131 }, { runway: "31", side: "left", trueHdg: 311 }], calmRunway: "13", wxStation: "KLXL" },
  "18V": { ident: "18V", elevation: 4965, tpaAgl: 1000, runway: "15", runwayFt: 4100, side: "left", threshold: { x: 687, y: 506 }, end: { x: 813, y: 994 }, offset: 202, extension: 101, aircraft: ["N7108G", "N6641F", "N11059"], ends: [{ runway: "15", side: "left", trueHdg: 165 }, { runway: "33", side: "left", trueHdg: 345 }], calmRunway: "15", wxStation: "KDEN" },
  P52: { ident: "P52", elevation: 3560, tpaAgl: 800, runway: "14", runwayFt: 4250, side: "left", threshold: { x: 650, y: 529 }, end: { x: 850, y: 971 }, offset: 166, extension: 83, aircraft: ["N8570B", "N11059", "N6717A"], ends: [{ runway: "14", side: "left", trueHdg: 156 }, { runway: "32", side: "right", trueHdg: 336 }], calmRunway: "32", wxStation: "KSEZ" },
} as const satisfies Record<string, import("./traffic-pattern").PatternField>;
