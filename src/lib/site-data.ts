import n6717aImage from "../assets/fleet/n6717a.jpg";
import n8570bImage from "../assets/fleet/n8570b.jpg";
import n6641fImage from "../assets/fleet/n6641f.jpg";
import n96150Image from "../assets/fleet/n96150.jpg";
import n11059Image from "../assets/fleet/n11059.jpg";
import n7108gImage from "../assets/fleet/n7108g.jpg";
import n3353pImage from "../assets/fleet/n3353p.jpg";

export type Program = {
  slug: string;
  name: string;
  short: string;
  description: string;
  details: string[];
};

export const programs: Program[] = [
  { slug: "private-pilot", name: "Private Pilot", short: "Start flying", description: "Build the foundation for every rating that follows with focused ground and flight instruction.", details: ["Local and accelerated formats", "Ground and flight training", "Preparation for the practical test"] },
  { slug: "instrument-rating", name: "Instrument Rating", short: "Fly with precision", description: "Develop the skills and judgment to operate safely by reference to instruments.", details: ["Structured instrument syllabus", "Simulator and aircraft training", "Practical-test preparation"] },
  { slug: "commercial-single-engine", name: "Commercial Single-Engine", short: "Fly professionally", description: "Advance your flying to commercial standards through concentrated training and preparation.", details: ["Commercial maneuvers", "Oral-exam preparation", "Checkride-focused training"] },
  { slug: "commercial-multi-engine", name: "Commercial Multi-Engine", short: "Add multi-engine", description: "Train for multi-engine commercial privileges in the school’s twin-engine aircraft.", details: ["Systems and aerodynamics", "Engine-out procedures", "Commercial multi preparation"] },
  { slug: "cfi-cfii", name: "CFI & CFII", short: "Start instructing", description: "A focused instructor pathway designed around a 4–6 week training timeline.", details: ["CFI and CFII pathway", "1-hour oral preparation", "1-hour flight preparation"] },
  { slug: "mei", name: "Multi-Engine Instructor", short: "Teach in twins", description: "Add multi-engine instructor privileges and expand the students you can teach.", details: ["Multi-engine teaching skills", "Systems mastery", "Practical-test preparation"] },
  { slug: "zero-to-hero", name: "Zero to Hero", short: "Build a career path", description: "Connect each rating into one clear professional-pilot training sequence.", details: ["Private through commercial", "Instructor-rating pathway", "Personalized timeline planning"] },
];

export const testimonials = [
  { quote: "I had a great experience with Lakes Area Aviation. They helped me complete CFI training and checkride in 10 days, in mid January! I went back up a couple months later and finished CFI-I in a total of 12 days!", name: "Andrew Cashen", detail: "Accelerated CFI & CFI-I student" },
  { quote: "There were plenty of options for housing, transportation, and excellent service. I finished my rating and would highly recommend checking them out!", name: "Brian Pinkney", detail: "Private pilot student" },
  { quote: "The instruction is top-quality, delivered by experienced and supportive instructors. The entire staff is warm and welcoming.", name: "Kevin Bounda", detail: "Commercial single & multi-engine student" },
];

export const locations = [
  { city: "Little Falls, Minnesota", airport: "Little Falls/Morrison County Airport · KLXL", address: "13129 Airport Rd, Little Falls, MN 56345", phone: "218-851-2196" },
  { city: "Fort Lupton, Colorado", airport: "Platte Valley Airpark · 18V", address: "7507 Co Rd 39, Fort Lupton, CO 80621", phone: "303-718-3779" },
  { city: "Cottonwood, Arizona", airport: "Cottonwood Municipal Airport · P52", address: "1001 W Mingus Avenue, Cottonwood, AZ 86326", phone: "928-274-9996" },
];

export const fleet = [
  { name: "1956 Cessna 172", registration: "N6717A", nickname: "Blue", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n6717aImage, position: "center" },
  { name: "1957 Cessna 172", registration: "N8570B", nickname: "Phoenix", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n8570bImage, position: "center" },
  { name: "1966 Cessna 150", registration: "N6641F", nickname: "Elliott", use: "Primary training", note: "Efficient time-building and foundational instruction.", image: n6641fImage, position: "center" },
  { name: "1946 Taylorcraft BC-12D", registration: "N96150", nickname: "Tweety", use: "Tailwheel training", note: "Classic stick-and-rudder skill development.", image: n96150Image, position: "center" },
  { name: "1965 Champion 7ECA", registration: "N11059", nickname: "Citabria", use: "Specialized training", note: "Tailwheel and specialized flight experience.", image: n11059Image, position: "center" },
  { name: "1970 Cessna 172K", registration: "N7108G", nickname: "Hawk", use: "Primary · Instrument · Commercial", note: "A real Lakes Area Aviation training aircraft photographed at the school.", image: n7108gImage, position: "center" },
  { name: "1958 Piper Apache", registration: "N3353P", nickname: "Tot", use: "Multi-engine training", note: "Twin-engine systems, procedures, and commercial training.", image: n3353pImage, position: "center" },
];