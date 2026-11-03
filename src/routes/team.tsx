import { createFileRoute } from "@tanstack/react-router";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import jacob from "../assets/team/jacob-heffron.jpg.asset.json";
import justin from "../assets/team/justin-buchli.jpg.asset.json";
import mary from "../assets/team/mary-trittin.jpg.asset.json";
import ron from "../assets/team/ron-kresha.jpg.asset.json";
import payton from "../assets/team/payton-meyer.jpg.asset.json";
import layne from "../assets/team/layne-bradley.jpg.asset.json";
import nate from "../assets/team/nate-hawkins.jpg.asset.json";
import bailey from "../assets/team/bailey-schommer.jpg.asset.json";
import austin from "../assets/team/austin-bryant.jpg.asset.json";
import john from "../assets/team/john-holthaus.jpg.asset.json";

const team = [
  { name: "Jacob Heffron", ratings: "CFI, CFII, MEI", role: "Owner", img: jacob.url },
  { name: "Justin Buchli", ratings: "CFI, CFI-I", img: justin.url },
  { name: "Mary Trittin", ratings: "CFI, CFII", img: mary.url },
  { name: "Ron Kresha", ratings: "CFI, CFII, MEI", img: ron.url },
  { name: "Payton Meyer", ratings: "CFI", img: payton.url },
  { name: "Layne Bradley", ratings: "CFI", img: layne.url },
  { name: "Nate Hawkins", ratings: "CFI, CFI-I, MEI", img: nate.url },
  { name: "Bailey Schommer", ratings: "CFI, CFI-I, MEI", img: bailey.url },
  { name: "Austin Bryant", ratings: "CFI, CFI-I", img: austin.url },
  { name: "John Holthaus", ratings: "Helicopter CFI", img: john.url },
];

export const Route = createFileRoute("/team")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("Flight Instructors & Team | Lakes Area Aviation", "Meet Lakes Area Aviation's owner and flight instructors — CFI, CFII, MEI, and helicopter CFI.") }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro eyebrow="Our team" title="Reach your goals with our instructors." text="A talented and dedicated team of flight instructors across airplane, instrument, multi-engine, and helicopter training." />
      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
        <div className="stagger-grid grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-5" data-scroll-reveal>
          {team.map((t) => (
            <article key={t.name} className="card-lift group min-w-0 overflow-hidden rounded-sm border border-border bg-card">
              <div className="zoom-reveal aspect-square overflow-hidden bg-secondary">
                <img src={t.img} alt={`${t.name}, ${t.ratings}`} loading="lazy" width={640} height={640} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="p-4 sm:p-5">
                {t.role && <p className="eyebrow text-primary-text">{t.role}</p>}
                <h2 className="mt-1 font-display text-lg leading-tight sm:text-xl">{t.name}</h2>
                <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm">{t.ratings}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}

const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
