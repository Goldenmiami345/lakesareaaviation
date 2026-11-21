import { SlotText } from "@/components/slot-text";
import { createFileRoute } from "@tanstack/react-router";
import { InquiryBand, PageIntro, SiteLayout } from "../components/site-shell";
import { team } from "../lib/team-data";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({ meta: m("About & Team | Lakes Area Aviation Flight Instructors", "Meet Lakes Area Aviation's owner and flight instructors (CFI, CFII, MEI and helicopter CFI) and the school built around capable instruction and students' goals.") }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <PageIntro k="about.intro" eyebrow="About the school" title="A practical place to become a better pilot." text="Flight instruction, pilot services and specialized training in Minnesota, Colorado and Arizona." />
      <div>
        {/* Team first: faces are what visitors come to About for. */}
        <section id="team" className="site-container scroll-mt-20 pb-6 pt-10 sm:pt-16">
          <div className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-3">
            <h2 className="font-display text-3xl leading-tight sm:text-5xl"><SlotText k="about.text.0" d="Meet the team" /></h2>
            <p className="shrink-0 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">{team.length}<SlotText k="about.text.1" d=" instructors" /></p>
          </div>
          <p className="mt-4 max-w-2xl text-foreground/80"><SlotText k="about.text.2" d="A talented and dedicated team of flight instructors across airplane, instrument, multi-engine, and helicopter training." /></p>
          <div className="stagger-grid mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-5" data-scroll-reveal>
            {team.map((t, i) => (
              <article key={t.name} className="group min-w-0">
                <div className="aspect-square overflow-hidden bg-secondary">
                  <img src={t.img} alt={`${t.name}, ${t.ratings}`} loading="lazy" width={640} height={640} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <h3 className="mt-2 font-display text-base leading-tight sm:text-xl"><SlotText k={`team.${i}.name`} d={t.name} /></h3>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-foreground/70 sm:text-sm">{t.role ? <><SlotText k={`team.${i}.role`} d={t.role} /> · </> : ""}<SlotText k={`team.${i}.ratings`} d={t.ratings} /></p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-container grid gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <h2 className="font-display text-3xl sm:text-5xl"><SlotText k="about.text.3" d="Focused instruction." /><br /><SlotText k="about.text.4" d="A welcoming airport." /><br /><SlotText k="about.text.5" d="Real progress." /></h2>
          <div className="space-y-5 leading-relaxed text-foreground/80">
            <p><SlotText k="about.text.6" d="Lakes Area Aviation, LLC was founded with the goal of providing high quality and safe aviation services and instruction, while striving to remain affordable for anyone who has a passion for aviation." /></p>
            <p><SlotText k="about.text.7" d="Our vision is to “Build A Community of Aviators” by engaging the community through education, in order to inspire the next generation of pilots." /></p>
          </div>
        </section>
      </div>
      <InquiryBand />
    </SiteLayout>
  );
}

const m = (title: string, d: string) => [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }];
