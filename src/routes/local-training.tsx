import introImg from "../assets/photos/lake-aerial.webp";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { locations, SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";

export const Route = createFileRoute("/local-training")({
  staticData: { sitemap: true },
  head: () => ({
    meta: m(
      "Local Flight Training | Lakes Area Aviation",
      "Train at your own pace in Little Falls MN, Fort Lupton CO, or Cottonwood AZ. Ratings, endorsements, career changes, and hobby flying — tailored to your goals."
    ),
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro image={introImg} imageAlt="Aerial view of a Minnesota lake shoreline"
        eyebrow="Local training"
        title="Train at your own pace, close to home."
        text="While we specialize in accelerated, full-time training, we value our local students — one of our main goals is to grow a community of aviators."
      />
      <div className="site-container py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr]" data-scroll-reveal>
          <div>
            <p className="eyebrow text-primary-text">Your goals, your schedule</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">A community of aviators.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Whether you are looking to work through your career change into aviation, are adding a rating or endorsement to your skill set, or are getting into aviation as a hobby, we are excited to help you reach your goals at your own pace.
            </p>
            <div className="stagger-grid mt-10 grid gap-px border border-border bg-border sm:grid-cols-3">
              {[
                ["Career change", "Work through a structured path into professional aviation."],
                ["Ratings & endorsements", "Add an instrument, commercial, tailwheel, or instructor rating."],
                ["Fly for fun", "Get into aviation as a hobby with instruction built around your life."],
              ].map(([t, d]) => (
                <div key={t} className="card-lift bg-background p-6">
                  <h3 className="font-display text-xl">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            <Link to="/contact" className="btn-shine mt-10 inline-flex min-h-14 items-center gap-3 bg-primary px-6 text-sm font-bold uppercase text-primary-foreground">
              Build my training plan <ArrowRight className="size-4" />
            </Link>
          </div>
          <div>
            <p className="eyebrow text-primary-text">Three great locations</p>
            <div className="stagger-grid mt-6 grid gap-px border border-border bg-border" data-scroll-reveal>
              {locations.map((l) => (
                <div key={l.city} className="card-lift bg-background p-6">
                  <h3 className="font-display text-2xl">{l.city}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary-text">{l.airport}</p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" />{l.address}</p>
                </div>
              ))}
            </div>
            <a href={SCHOOL_PHONE_TEL} className="mt-7 -mb-1 inline-flex min-h-11 items-center gap-3 font-display text-3xl text-primary-text"><Phone className="size-6" />{SCHOOL_PHONE}</a>
          </div>
        </div>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}

const m = (title: string, d: string) => [
  { title },
  { name: "description", content: d },
  { property: "og:title", content: title },
  { property: "og:description", content: d },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];
