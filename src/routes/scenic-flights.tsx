import { rateKey, } from "@/lib/rates-engine";
import { SlotText, RateText, } from "@/components/slot-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone, Users } from "lucide-react";
import scenic1 from "../assets/scenic-1.jpg.asset.json";
import scenic2 from "../assets/scenic-2.jpg.asset.json";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { locations, SCHOOL_PHONE, SCHOOL_PHONE_TEL } from "../lib/site-data";

export const Route = createFileRoute("/scenic-flights")({
  staticData: { sitemap: true },
  head: () => ({
    meta: m(
      "Scenic Flights | Lakes Area Aviation",
      "See Minnesota fall leaves, the Rocky Mountains, or your childhood landmarks from the sky. Scenic flights at $129 per hour for up to three people."
    ),
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro k="scenic-flights.intro"
        eyebrow="Scenic flights"
        title="See your world from the sky."
        text="Minnesota fall colors, the Rocky Mountains or your childhood landmarks, seen from above."
      />
      <div className="site-container pb-16 pt-8 sm:pb-20 sm:pt-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col justify-center" data-scroll-reveal>
            <p className="eyebrow text-primary-text"><SlotText k="scenic-flights.text.1" d="The experience" /></p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl"><SlotText k="scenic-flights.text.2" d="An hour you’ll never forget." /></h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              <SlotText k="scenic-flights.text.3" d="We offer scenic flights for" /> <RateText k={rateKey.other("Scenic flight (up to three people)")} amount /> <SlotText k="scenic-flights.text.4" d="per hour of flight with up to three people. Call us to schedule today." />
            </p>
            <div className="stagger-grid mt-10 grid gap-px border border-border bg-border sm:grid-cols-2">
              <div className="card-lift bg-background p-6">
                <p className="font-display text-4xl text-primary-text"><RateText k={rateKey.other("Scenic flight (up to three people)")} amount /></p>
                <p className="mt-2 text-sm text-muted-foreground"><SlotText k="scenic-flights.text.5" d="Per hour of flight" /></p>
              </div>
              <div className="card-lift bg-background p-6">
                <p className="flex items-center gap-2 font-display text-4xl text-primary-text"><Users className="size-7" /> 3</p>
                <p className="mt-2 text-sm text-muted-foreground"><SlotText k="scenic-flights.text.6" d="Up to three people per flight" /></p>
              </div>
            </div>
            <a href={SCHOOL_PHONE_TEL} className="btn-shine mt-10 inline-flex min-h-14 items-center justify-center gap-3 bg-primary px-6 text-sm font-bold uppercase text-primary-foreground sm:w-fit">
              <Phone className="size-4" /> <SlotText k="scenic-flights.text.7" d="Call to schedule" />
            </a>
          </div>
          <div className="grid gap-5" data-scroll-reveal>
            <div className="zoom-reveal aspect-[4/3] overflow-hidden bg-muted" data-scroll-reveal>
              <img src={scenic1.url} alt="Aerial view on a Lakes Area Aviation scenic flight" width={1200} height={900} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="zoom-reveal aspect-[4/3] overflow-hidden bg-muted" data-scroll-reveal>
              <img src={scenic2.url} alt="Landscape seen from a Lakes Area Aviation scenic flight" width={1199} height={900} loading="lazy" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div className="mt-20" data-scroll-reveal>
          <p className="eyebrow text-primary-text"><SlotText k="scenic-flights.text.8" d="Depart from" /></p>
          <h2 className="mt-4 font-display text-4xl"><SlotText k="scenic-flights.text.9" d="Three great locations." /></h2>
          <div className="stagger-grid mt-8 grid gap-px border border-border bg-border md:grid-cols-3">
            {locations.map((l,i) => (
              <div key={l.city} className="card-lift bg-background p-6">
                <h3 className="font-display text-2xl"><SlotText k={`location.${i}.city`} d={l.city} /></h3>
                <p className="mt-1 text-sm font-semibold text-primary-text"><SlotText k={`location.${i}.airport`} d={l.airport} /></p>
                <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /><SlotText k={`location.${i}.address`} d={l.address} /></p>
              </div>
            ))}
          </div>
          <a href={SCHOOL_PHONE_TEL} className="mt-8 inline-flex min-h-11 items-center gap-3 font-display text-3xl text-primary-text"><Phone className="size-6" />{SCHOOL_PHONE}</a>
          <Link to="/introductory-flights" className="interactive-arrow mt-10 inline-flex items-center gap-3 text-sm font-bold uppercase text-primary-text">
            <SlotText k="scenic-flights.text.10" d="Or start with a" /> <RateText k={rateKey.other("Introductory flight")} amount /> <SlotText k="scenic-flights.text.11" d="intro flight" /> <ArrowRight className="size-4" />
          </Link>
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
