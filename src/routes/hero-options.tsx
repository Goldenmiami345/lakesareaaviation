import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/lakes-logo-transparent.png.asset.json";
import sunset from "@/assets/photos/sunset-ramp.webp";
import blue from "@/assets/fleet/n6717a.webp";
import optionA from "@/assets/hero-options/option-a.webp";
import optionB from "@/assets/hero-options/option-b.webp";
import "@/components/hero-options.css";

export const Route = createFileRoute("/hero-options")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Hero Photo Options | Lakes Area Aviation" },
    { name: "description", content: "Private phone and desktop hero photo comparison for Lakes Area Aviation." },
    { property: "og:title", content: "Hero Photo Options | Lakes Area Aviation" },
    { property: "og:description", content: "Compare four homepage photo compositions without changing the live homepage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: HeroOptions,
});

const options = [
  { id: "A", title: "Same photo, reframed", phone: optionA, desktop: sunset, detail: "Original airplane pixels preserved. Extended sky and empty ramp. Review note: the upper sky join remains visible; not final-photo quality.", size: "Phone 258.7 KB · Desktop 80.9 KB", alt: "Real Cessna N6717A at sunset, with extended sky and ramp" },
  { id: "B", title: "Same photo, sunset enhanced", phone: optionB, desktop: sunset, detail: "Original airplane pixels preserved. Warmer extended sky and softer ramp shadows. Desktop retains the original sunset. Review note: the invented sky lighting and ramp grain need owner approval.", size: "Phone 256.1 KB · Desktop 80.9 KB", alt: "Real Cessna N6717A with a warmer sunset sky above it" },
  { id: "C", title: "Blue, in daylight", phone: blue, desktop: blue, detail: "Real school fleet photo of N6717A. No AI editing.", size: "191.4 KB shared by phone and desktop", alt: "Lakes Area Aviation blue and white Cessna N6717A on the ramp in daylight" },
  { id: "D", title: "Original photo, headline above", phone: sunset, desktop: sunset, detail: "No AI editing. The phone headline moves above the photograph.", size: "80.9 KB shared by phone and desktop", alt: "Original school sunset photo of Cessna N6717A and the Piper Apache" },
] as const;
const locations = [["Little Falls", "MN", "KLXL"], ["Fort Lupton", "CO", "18V"], ["Cottonwood", "AZ", "P52"]] as const;

function HeroOptions() {
  return <main id="main" className="hero-comparison bg-ink text-background">
    {options.map((option) => <section key={option.id} aria-label={`Option ${option.id}: ${option.title}`}>
      <Hero option={option} mode="phone" />
      <div className="border-y border-background/15 px-5 py-6 lg:px-8">
        <p className="stage-label">Option {option.id} · Desktop framing</p>
        <h2 className="mt-2 font-display text-2xl">{option.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-background/75">{option.detail}</p>
        <p className="mt-2 text-xs text-background/60">{option.size}</p>
      </div>
      <Hero option={option} mode="desktop" />
    </section>)}
  </main>;
}

function Hero({ option, mode }: { option: typeof options[number]; mode: "phone" | "desktop" }) {
  return <div data-option={option.id} data-framing={mode} className={`option-hero option-${option.id.toLowerCase()} option-${mode} relative isolate overflow-hidden bg-ink text-background`}>
    <img src={mode === "phone" ? option.phone : option.desktop} alt={option.alt} loading={option.id === "A" && mode === "phone" ? "eager" : "lazy"} decoding="async" className="option-photo absolute inset-0 -z-20 h-full w-full object-cover" />
    <div className="option-shade absolute inset-0 -z-10" />
    <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-between border-b border-background/15 px-5 lg:h-20 lg:px-8">
      <img src={logo.url} alt="Lakes Area Aviation" className="h-10 w-auto max-w-[180px] brightness-0 invert" />
      <span className="text-xs font-bold uppercase">Option {option.id} · {mode}</span>
    </div>
    <div className="option-content relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-[calc(2.25rem+env(safe-area-inset-bottom))] pt-24 lg:px-8">
      <div className="option-copy max-w-3xl">
        <p className="stage-label">Accelerated flight training</p>
        <h2 className="mt-4 font-display text-5xl leading-[1.12]">Zero to Hero.</h2>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-background/80">From your first flight to commercial pilot and instructor.</p>
      </div>
      <div className="mt-7"><Button asChild variant="ghost" className="h-12 rounded-none border-b border-background/45 px-0 text-sm font-bold uppercase text-background hover:bg-transparent"><Link to="/contact">Build my training plan <span className="ml-2 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight /></span></Link></Button></div>
      <nav aria-label={`Option ${option.id} ${mode} training locations`} className="mt-6 flex items-center gap-1">
        <MapPin aria-hidden className="size-3.5 shrink-0 text-background/55" />
        {locations.map(([city, state, code]) => <Button key={code} asChild variant="ghost" className="h-11 shrink-0 rounded-full border border-background/25 px-2 text-xs font-bold uppercase text-background/75 hover:bg-primary hover:text-primary-foreground"><Link to="/contact" search={{ location: code }}>{city}, {state}</Link></Button>)}
      </nav>
    </div>
  </div>;
}