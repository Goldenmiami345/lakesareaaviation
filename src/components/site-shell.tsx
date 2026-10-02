import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import logoAsset from "../assets/lakes-logo-transparent.png.asset.json";
import { MotionExperience } from "./motion-experience";

const nav = [
  ["Accelerated", "/accelerated-training"],
  ["Programs", "/programs"],
  ["Fleet", "/fleet"],
  ["Rates", "/rates"],
  ["About", "/about"],
] as const;

export function Header({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${overlay ? "border-white/15 bg-ink/25 text-white backdrop-blur-md" : "border-border bg-background/95 text-foreground backdrop-blur-md"}`}>
    <div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:flex lg:justify-between lg:px-8">
      <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Lakes Area Aviation home">
        <img src={logoAsset.url} alt="Lakes Area Aviation" className={`h-12 w-auto max-w-[220px] object-contain ${overlay ? "brightness-0 invert" : ""}`} />
      </Link>
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
        {nav.map(([label, to]) => <Link key={to} to={to} className="text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:text-primary">{label}</Link>)}
        <Link to="/contact" className="bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-foreground hover:text-background">Build my training plan</Link>
      </nav>
      <button aria-label={open ? "Close menu" : "Open menu"} className="grid size-11 place-items-center lg:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav className="border-t border-current/10 bg-background px-5 py-5 text-foreground lg:hidden" aria-label="Mobile navigation">
      <div className="grid gap-1">{nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="border-b border-border py-4 font-display text-xl">{label}</Link>)}<Link to="/contact" onClick={() => setOpen(false)} className="mt-4 bg-primary px-5 py-4 text-center text-sm font-bold uppercase text-primary-foreground">Build my training plan</Link></div>
    </nav>}
  </header>;
}

export function Footer() {
  return <footer className="bg-foreground pb-24 pt-16 text-background md:pb-12">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-[1.3fr_2fr] lg:px-8">
      <div><img src={logoAsset.url} alt="Lakes Area Aviation" loading="lazy" className="h-16 w-auto max-w-full brightness-0 invert" /><p className="mt-5 max-w-sm text-sm text-background/65">Flight instruction, accelerated ratings, commercial pilot services, aircraft management, and specialized training.</p></div>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
        <FooterGroup title="Train" links={[["Accelerated", "/accelerated-training"], ["CFI & CFII", "/programs/cfi-cfii"], ["All programs", "/programs"], ["Rates", "/rates"]]} />
        <FooterGroup title="Explore" links={[["Fleet", "/fleet"], ["Team", "/team"], ["Success", "/student-success"], ["About", "/about"]]} />
        <FooterGroup title="Start" links={[["Intro flight", "/introductory-flights"], ["New students", "/new-students"], ["Locations", "/locations"], ["Contact", "/contact"]]} />
      </div>
    </div>
    <div className="mx-auto mt-14 max-w-7xl border-t border-background/15 px-5 pt-6 text-xs text-background/45 lg:px-8">© 2026 Lakes Area Aviation, LLC. Training timelines vary by student readiness, weather, and examiner availability.</div>
  </footer>;
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">{title}</p><div className="grid gap-3">{links.map(([label, to]) => <Link key={to} to={to} className="text-sm text-background/70 hover:text-background">{label}</Link>)}</div></div>;
}

export function MobileActions() {
  return <div className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 overflow-hidden border border-white/20 bg-foreground text-background shadow-2xl md:hidden"><a href="tel:2188512196" className="flex min-h-14 items-center justify-center gap-2 text-sm font-bold"><Phone className="size-4" /> Call</a><Link to="/contact" className="flex min-h-14 items-center justify-center bg-primary text-sm font-bold text-primary-foreground">Apply now</Link></div>;
}

export function SiteLayout({ children, overlayHeader = false }: { children: ReactNode; overlayHeader?: boolean }) {
  return <><MotionExperience /><Header overlay={overlayHeader} />{children}<Footer /><MobileActions /></>;
}

export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="bg-foreground pb-20 pt-36 text-background"><div className="mx-auto max-w-7xl px-5 lg:px-8" data-scroll-reveal><p className="eyebrow text-primary">{eyebrow}</p><h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.98] sm:text-7xl">{title}</h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/70">{text}</p></div></section>;
}

export function InquiryBand() {
  return <section className="bg-primary py-16 text-primary-foreground"><div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:grid-cols-[1fr_auto] lg:px-8" data-scroll-reveal><div><p className="eyebrow text-primary-foreground/70">Your next rating</p><h2 className="mt-3 font-display text-4xl">Build a training plan around your timeline.</h2></div><Link to="/contact" className="interactive-arrow inline-flex min-h-14 items-center justify-center bg-foreground px-7 text-sm font-bold uppercase tracking-[0.1em] text-background">Start planning <span aria-hidden="true">→</span></Link></div></section>;
}