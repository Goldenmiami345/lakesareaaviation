import heroImg from "../assets/photos/above-clouds.webp";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { locations, SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";

const title = "Students | Lakes Area Aviation";
const description = "New students: talk with our team and sign up for scheduling. Current students: request access to Lakes Area Aviation training resources.";

export const Route = createFileRoute("/students")({
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

function Page() {
  return (
    <SiteLayout>
      <PageIntro image={heroImg} imageAlt="Sunset above the clouds"
        eyebrow="Students"
        title="Helping you reach your aviation goals in three great locations."
        text="New to Lakes Area Aviation or already training with us? Start here."
      />
      <div className="site-container py-20">
        <div className="grid gap-6 md:grid-cols-2" data-scroll-reveal>
          <div className="card-lift border border-border bg-card p-8">
            <p className="eyebrow text-primary-text">New students</p>
            <p className="mt-4 text-lg text-muted-foreground">To talk with a member of our team, call us or build your training plan with the button below.</p>
            <Link to="/contact" className="btn-shine mt-6 inline-flex min-h-12 items-center bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">Build my training plan</Link>
            <p className="mt-8 text-lg text-muted-foreground">Once you have talked with us, click the following button to get our scheduling system and start your journey!</p>
            <Link to="/new-students" className="mt-6 inline-flex min-h-12 items-center border border-ink px-6 text-xs font-bold uppercase tracking-[0.12em]">Sign up</Link>
          </div>
          <div className="card-lift border border-border bg-ink p-8 text-background">
            <p className="eyebrow text-primary-text">Current students</p>
            <p className="mt-4 text-lg text-background/75">Use the link below to request access to our various training resources.</p>
            <Link to="/contact" className="btn-shine mt-6 inline-flex min-h-12 items-center bg-primary px-6 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground">Build my training plan</Link>
          </div>
        </div>
        <div className="stagger-grid mt-16 grid gap-6 md:grid-cols-3" data-scroll-reveal>
          {locations.map((l) => (
            <div key={l.city} className="border-t-2 border-primary pt-6">
              <h2 className="font-display text-2xl">{l.airport}</h2>
              <p className="mt-3 flex gap-2 text-muted-foreground"><MapPin className="mt-1 size-4 shrink-0 text-primary-text" />{l.address}</p>
            </div>
          ))}
        </div>
        <a href={SCHOOL_PHONE_TEL} className="mt-9 -mb-1 inline-flex min-h-11 items-center gap-3 font-display text-3xl text-primary-text"><Phone className="size-6" />{SCHOOL_PHONE}</a>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}
