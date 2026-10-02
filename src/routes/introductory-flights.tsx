import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro, SiteLayout } from "../components/site-shell";

export const Route = createFileRoute("/introductory-flights")({
  head: () => ({ meta: [
    { title: "Introductory Flights | Lakes Area Aviation" },
    { name: "description", content: "Take a $100 introductory flight and experience flight training from the pilot's seat." },
    { property: "og:title", content: "Introductory Flights | Lakes Area Aviation" },
    { property: "og:description", content: "Your first flight lesson starts at $100." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Page,
});
function Page(){return <SiteLayout><PageIntro eyebrow="First flight" title="Take the pilot's seat for $100." text="An introductory flight is a hands-on first lesson and the clearest way to find out if flight training is right for you."/><main className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8"><div><p className="eyebrow text-primary">Your introduction</p><h2 className="mt-4 font-display text-4xl">Fly one of our aircraft with a highly-trained instructor.</h2></div><div><p className="leading-relaxed text-muted-foreground">New to aviation or finding a new flight school? We offer introductory flights that allow you to fly one of our aircraft with one of our highly-trained flight instructors for the low price of $100. Call us to schedule!</p><Link to="/contact" className="mt-8 inline-flex bg-primary px-6 py-4 text-sm font-bold uppercase text-primary-foreground">Schedule an introductory flight</Link></div></main></SiteLayout>}