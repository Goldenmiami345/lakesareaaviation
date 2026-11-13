// Photos for each specialty page. Only real Lakes Area Aviation photos are used; `standIn`
// marks a scenic stand-in until the owner supplies a photo of that exact training.
import tailwheel from "../assets/fleet/n96150.webp";
import citabria from "../assets/fleet/n11059.webp";
import apache from "../assets/fleet/walkaround/n4383p-03-1600.webp.asset.json";
import clouds from "../assets/photos/above-clouds.webp";
import sedonaWing from "../assets/photos/sedona-wing.webp";
import sedonaAirport from "../assets/photos/sedona-airport.webp";
import lake from "../assets/photos/lake-aerial.webp";
import cockpit from "../assets/journey/instrument-real-cockpit.webp";
import teaching from "../assets/journey/05-cfi-teaching.webp";

export type SpecialtyPhoto = { src: string; alt: string; standIn?: boolean };
export const SPECIALTY_PHOTOS: Record<string, SpecialtyPhoto> = {
  "kodiak-100": { src: sedonaAirport, alt: "Sedona airport on a mesa above red rock country", standIn: true },
  tailwheel: { src: tailwheel, alt: "Lakes Area Aviation Taylorcraft BC-12D N96150 “Tweety” in flight" },
  complex: { src: apache.url, alt: "Lakes Area Aviation Piper Apache N4383P on the ramp" },
  "high-performance": { src: cockpit, alt: "Instrument panel seen from the left seat in flight", standIn: true },
  "high-altitude": { src: clouds, alt: "Sunset above a deck of clouds" },
  "spin-training": { src: citabria, alt: "Lakes Area Aviation Champion 7ECA Citabria N11059 in the hangar" },
  "mountain-flying": { src: sedonaWing, alt: "View under a wing over red rock mountains", standIn: true },
  "light-aerobatics": { src: citabria, alt: "Lakes Area Aviation Champion 7ECA Citabria N11059 in the hangar" },
  "ski-plane": { src: lake, alt: "Forested lakeshore from the air", standIn: true },
  "cirrus-transition": { src: teaching, alt: "Instructor and pilot in the cockpit over lakes", standIn: true },
};
