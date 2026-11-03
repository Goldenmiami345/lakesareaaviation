import heroImg from "../assets/photos/sedona-wing.webp";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";

const title = "Our Services | Lakes Area Aviation";
const description = "Accelerated training, introductory flights, local training, scenic flights, specialized training, and Zero-to-Hero programs at Lakes Area Aviation.";

export const Route = createFileRoute("/services")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const services = [
  ["Accelerated Training", "/accelerated-training", "Full-time, focused training built around your next rating and checkride."],
  ["Introductory Flights", "/introductory-flights", "Take the controls for the first time with one of our instructors."],
  ["Local Training", "/local-training", "Train at your own pace close to home and join a community of aviators."],
  ["Scenic Flights", "/scenic-flights", "See the lakes and landscapes from above — up to three passengers."],
  ["Specialized Training", "/specialized-training", "Kodiak 100 training, endorsements, and specialty courses."],
  ["Zero-to-Hero", "zero", "From zero flight hours through your instructor ratings in one plan."],
] as const;

function Page() {
  return (
    <SiteLayout>
      <PageIntro image={heroImg} imageAlt="View under an aircraft wing over red rock country"
        eyebrow="Our services"
        title="Every rating, endorsement, and experience."
        text="Whether you have zero flight hours or have three-hundred and are looking to finish a multi-engine commercial certificate, we are the school for you. We offer a wide variety of ratings, endorsements, and aviation experiences. All of our offerings are tailored to suit your individual needs."
      />
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="stagger-grid grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3" data-scroll-reveal>
          {services.map(([name, to, text]) => (
            <Link key={to} to={to === "zero" ? "/programs/$slug" : to} params={{ slug: "zero-to-hero" }} className="program-card interactive-arrow group bg-background p-8">
              <h2 className="font-display text-3xl">{name}</h2>
              <p className="mt-4 text-muted-foreground">{text}</p>
              <span className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-text">Explore <ArrowRight className="size-4" /></span>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">Helicopter training: call us, or <Link to="/contact" className="text-primary-text underline">build my training plan</Link> to ask about current availability.</p>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}
