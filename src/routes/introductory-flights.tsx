import introImg from "../assets/photos/above-clouds.webp";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro, SiteLayout } from "../components/site-shell";

export const Route = createFileRoute("/introductory-flights")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Introductory Flights | Lakes Area Aviation" },
    { name: "description", content: "Take a $100 introductory flight and experience flight training from the pilot's seat." },
    { property: "og:title", content: "Introductory Flights | Lakes Area Aviation" },
    { property: "og:description", content: "Your first flight lesson starts at $100." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Page,
});
function Page(){return <SiteLayout><PageIntro image={introImg} imageAlt="Sunset above the clouds from a Lakes Area Aviation aircraft" eyebrow="First flight" title="Take the pilot's seat for $100." text="An introductory flight is a hands-on first lesson and the clearest way to find out if flight training is right for you."/><div className="site-container grid gap-6 py-10 sm:py-16 lg:grid-cols-2 lg:gap-12"><div><p className="eyebrow text-primary-text">Your introduction</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">Fly one of our aircraft with a highly-trained instructor.</h2></div><div><p className="leading-relaxed text-muted-foreground">New to aviation? Fly with one of our highly-trained instructors for $100. Call us to schedule!</p><Link to="/contact" className="mt-6 inline-flex bg-primary px-6 py-4 text-sm font-bold uppercase text-primary-foreground">Schedule an introductory flight</Link></div></div></SiteLayout>}