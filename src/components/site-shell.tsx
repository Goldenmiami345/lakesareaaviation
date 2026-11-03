import { Link, useLocation, useMatch } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import logoAsset from "../assets/lakes-logo-transparent.png.asset.json";
import { MotionExperience } from "./motion-experience";
import { jumpToPageTop } from "./flight-journey";
import { sitePath } from '../lib/site-path';

const nav = [
  ["Services", "/services"],
  ["Programs", "/programs"],
  ["Fleet", "/fleet"],
  ["Rates", "/rates"],
  ["Students", "/students"],
  ["About", "/about"],
] as const;

export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = useLocation({ select: location => sitePath(location.pathname) });
  const onHome = (e: MouseEvent) => { if (pathname !== "/") return; e.preventDefault(); setOpen(false); jumpToPageTop(); };
  return <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${overlay ? "border-white/15 bg-ink/25 text-white backdrop-blur-md" : "border-border bg-background/95 text-foreground backdrop-blur-md"}`}>
    <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:h-20 lg:flex lg:justify-between lg:px-8">
      <Link to="/" onClick={onHome} className="flex min-w-0 items-center gap-3" aria-label="Lakes Area Aviation home">
        <img src={logoAsset.url} alt="Lakes Area Aviation" className={`h-10 w-auto max-w-[190px] object-contain sm:h-12 sm:max-w-[220px] ${overlay ? "brightness-0 invert" : ""}`} />
      </Link>
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
        {nav.map(([label, to]) => <Link key={to} to={to} className="link-underline text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:text-primary-text">{label}</Link>)}
        <Link to="/contact" className={`group inline-flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 text-xs font-semibold tracking-[0.04em] backdrop-blur transition-all duration-300 hover:border-primary ${overlay ? "border-white/30 bg-white/10" : "border-border bg-background"}`}>Build my training plan<span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:rotate-45"><ArrowUpRight className="size-3.5" /></span></Link>
      </nav>
      <button aria-label={open ? "Close menu" : "Open menu"} className="grid size-10 place-items-center lg:hidden" onClick={() => setOpen(!open)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </div>
    {open && <nav className="border-t border-current/10 bg-background px-5 py-5 text-foreground lg:hidden" aria-label="Mobile navigation">
      <div className="grid gap-1">{nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="border-b border-border py-4 font-display text-xl">{label}</Link>)}<Link to="/contact" onClick={() => setOpen(false)} className="mt-4 bg-primary px-5 py-4 text-center text-sm font-bold uppercase text-primary-foreground">Build my training plan</Link></div>
    </nav>}
  </header>;
}

export function Footer() {
  return <footer data-no-float className="edge-fade-t bg-ink pb-[calc(6rem+env(safe-area-inset-bottom))] pt-28 text-background md:pb-12">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-[1.3fr_2fr] lg:px-8">
      <div><img src={logoAsset.url} alt="Lakes Area Aviation" loading="lazy" className="h-16 w-auto max-w-full brightness-0 invert" /><p className="mt-5 max-w-sm text-sm text-background/65">Flight instruction, accelerated ratings, commercial pilot services, aircraft management, and specialized training.</p></div>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
        <FooterGroup title="Train" links={[["Accelerated", "/accelerated-training"], ["CFI & CFII", "/programs/cfi-cfii"], ["All programs", "/programs"], ["Local training", "/local-training"], ["Specialized", "/specialized-training"], ["Rates", "/rates"]]} />
        <FooterGroup title="Explore" links={[["Fleet", "/fleet"], ["Team", "/team"], ["Success", "/student-success"], ["About", "/about"]]} />
        <FooterGroup title="Start" links={[["Intro flight", "/introductory-flights"], ["Scenic flights", "/scenic-flights"], ["New students", "/new-students"], ["Locations", "/locations"], ["Contact", "/contact"]]} />
      </div>
    </div>
    <div className="mx-auto mt-14 max-w-7xl border-t border-background/15 px-5 pt-6 text-xs text-background/45 lg:px-8">© 2026 Lakes Area Aviation, LLC. Training timelines vary by student readiness, weather, and examiner availability.</div>
  </footer>;
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary-text">{title}</p><div className="grid gap-3">{links.map(([label, to]) => <Link key={to} to={to} className="text-sm text-background/70 hover:text-background">{label}</Link>)}</div></div>;
}

export function MobileActions() {
  const pathname = useLocation({ select: location => sitePath(location.pathname) });
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      // Hide while the inquiry band (its own CTA) or the footer reaches the bottom of the screen.
      const nearEnd = [...document.querySelectorAll("[data-no-float]")].some((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight - 8 && r.bottom > 0; });
      // Home journeys carry a button on every stage, so the bar stays away while one is on screen.
      const inJourney = [...document.querySelectorAll("[data-journey-section]")].some((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight - 8 && r.bottom > 8; });
      setShow(window.scrollY > window.innerHeight * 0.9 && !nearEnd && !inJourney);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  if (pathname === "/contact") return null;
  return <div aria-hidden={!show} className={`fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-50 grid grid-cols-2 overflow-hidden border border-background/20 bg-ink text-background shadow-2xl transition-all duration-500 ease-out md:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0"}`}><a tabIndex={show ? 0 : -1} href="tel:3183479004" className="flex min-h-14 items-center justify-center gap-2 text-sm font-bold"><Phone className="size-4" /> Call</a><Link tabIndex={show ? 0 : -1} to="/contact" className="flex min-h-14 items-center justify-center bg-primary text-sm font-bold text-primary-foreground">Apply now</Link></div>;
}

export function SiteLayout({ children, overlayHeader = false }: { children: ReactNode; overlayHeader?: boolean }) {
  // Key the single page-enter fade on the RESOLVED leaf match (state.matches only switches
  // once the new route's loaders and code are ready), never on the raw pathname, so the
  // old page stays still until the new one renders and the fade plays exactly once.
  const pageKey = useMatch({ strict: false, select: (match) => match.id });
  return <><MotionExperience pageKey={pageKey} /><Header overlay={overlayHeader} /><main id="main" tabIndex={-1} key={pageKey} className="page-enter outline-none">{children}</main><Footer /><MobileActions /></>;
}

export function PageIntro({ eyebrow, title, text, image, imageAlt = "" }: { eyebrow: string; title: string; text: string; image?: string; imageAlt?: string }) {
  return <section className="relative isolate overflow-hidden edge-fade-b bg-ink pb-32 pt-36 text-background">{image && <><img src={image} alt={imageAlt} width={1920} height={1080} loading="eager" fetchPriority="high" decoding="async" className="hero-kenburns absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/25" /></>}<div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8" data-scroll-reveal><p className="stage-label">{eyebrow}</p><h1 className="mt-4 max-w-4xl font-display text-5xl sm:text-7xl">{title}</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/80">{text}</p></div></section>;
}

export function InquiryBand() {
  return <section data-no-float className="bg-primary py-16 text-primary-foreground"><div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:grid-cols-[1fr_auto] lg:px-8" data-scroll-reveal><div><p className="eyebrow text-primary-foreground/70">Your next rating</p><h2 className="mt-3 font-display text-4xl">Build a training plan around your timeline.</h2></div><Link to="/contact" className="interactive-arrow inline-flex min-h-14 items-center justify-center bg-ink px-7 text-sm font-bold uppercase tracking-[0.1em] text-background">Start planning <span aria-hidden="true">→</span></Link></div></section>;
}