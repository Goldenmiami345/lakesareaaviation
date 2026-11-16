import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, CircleDollarSign, LogOut, Palette, PencilLine, Plane, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { parseMobileJourneyMode, type MobileJourneyMode } from "@/lib/story-nav";
import { parseDesktopJourneyMode, type DesktopJourneyMode } from "@/lib/use-site-settings";
import { Button } from "@/components/ui/button";
import { AdminRates } from "@/components/admin-rates";
import { AdminContent } from "@/components/admin-content";
import { AdminCatalog } from "@/components/admin-catalog";
import { EDIT_PAGES, groupPages } from "@/lib/edit-pages";
import { editStore } from "@/lib/edit-store";
import { MAP_MODEL_AIRCRAFT } from "@/lib/map-models";
import { applyAccentTheme, type AccentTheme } from "@/components/theme-sync";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Site Admin | Lakes Area Aviation" },
    { name: "description", content: "Secure Lakes Area Aviation site appearance controls." },
    { property: "og:title", content: "Site Admin | Lakes Area Aviation" },
    { property: "og:description", content: "Secure Lakes Area Aviation site appearance controls." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<AccentTheme>("blue");
  const [journey, setJourney] = useState<MobileJourneyMode>("scroll");
  const [desktopJourney, setDesktopJourney] = useState<DesktopJourneyMode>("scroll");
  const [fleetModels, setFleetModels] = useState(false);
  const [mapModels, setMapModels] = useState(false);
  const [mapRegs, setMapRegs] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<SectionId>("edit");
  useEffect(() => {
    const fromHash = () => { const h = window.location.hash.slice(1); if (SECTIONS.some(x => x.id === h)) setTab(h as SectionId); };
    fromHash(); window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const go = (id: SectionId) => { setTab(id); setMessage(""); history.replaceState(null, "", `#${id}`); window.scrollTo({ top: 0 }); };

  useEffect(() => {
    const refresh = async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth.user ?? null);
      const [{ data: setting }, { data: role }] = await Promise.all([
        supabase.from("site_settings").select("accent_theme, mobile_journey_mode, desktop_journey_mode, show_3d_models, map_3d_models, map_3d_aircraft").eq("id", "brand").single(),
        auth.user ? supabase.from("user_roles").select("id").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (setting?.accent_theme === "blue" || setting?.accent_theme === "orange") setTheme(setting.accent_theme);
      setJourney(parseMobileJourneyMode(setting?.mobile_journey_mode));
      setDesktopJourney(parseDesktopJourneyMode(setting?.desktop_journey_mode));
      setFleetModels(setting?.show_3d_models === true);
      setMapModels(setting?.map_3d_models === true);
      setMapRegs(setting?.map_3d_aircraft ?? []);
      setIsAdmin(Boolean(role));
    };
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function emailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error?.message ?? "Signed in."); setBusy(false);
  }

  async function claimAdmin() {
    setBusy(true); setMessage("");
    const { data, error } = await supabase.rpc("claim_first_admin");
    setMessage(error?.message ?? (data ? "This account is now the site administrator." : "An administrator already exists."));
    if (data) setIsAdmin(true);
    setBusy(false);
  }

  async function changeTheme(next: AccentTheme) {
    if (!user || !isAdmin) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("site_settings").update({ accent_theme: next, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", "brand");
    if (error) setMessage(error.message);
    else { setTheme(next); applyAccentTheme(next); setMessage(`${next === "blue" ? "Royal blue" : "Original orange"} is now live for everyone.`); }
    setBusy(false);
  }

  async function changeJourney(next: MobileJourneyMode) {
    if (!user || !isAdmin) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("site_settings").update({ mobile_journey_mode: next, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", "brand");
    if (!error) try { localStorage.setItem("journey-mode", next); } catch { /* ignore */ }
    if (error) setMessage(error.message);
    else { setJourney(next); setMessage(`Phones now show ${next === "story" ? "Story mode" : "Fading scroll"} on the home page.`); }
    setBusy(false);
  }

  async function changeDesktopJourney(next: DesktopJourneyMode) {
    if (!user || !isAdmin) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("site_settings").update({ desktop_journey_mode: next, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", "brand");
    if (!error) try { localStorage.setItem("desktop-journey-mode", next); } catch { /* ignore */ }
    if (error) setMessage(error.message);
    else { setDesktopJourney(next); setMessage(`Computers now show ${next === "carousel" ? "Carousel" : "Fading scroll"} on the home page.`); }
    setBusy(false);
  }

  async function changeFleetModels(next: boolean) {
    if (!user || !isAdmin) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("site_settings").update({ show_3d_models: next, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", "brand");
    if (error) setMessage(error.message);
    else { setFleetModels(next); setMessage(next ? "Airplane info cards on the maps now show 3D models. Reload the site to see the change." : "3D is off. Airplane info cards show photos after reload."); }
    setBusy(false);
  }

  async function saveMapModels(nextOn: boolean, nextRegs: string[], done: string) {
    if (!user || !isAdmin) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("site_settings").update({ map_3d_models: nextOn, map_3d_aircraft: nextRegs, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", "brand");
    if (error) setMessage(error.message);
    else { setMapModels(nextOn); setMapRegs(nextRegs); setMessage(`${done} Reload the site to see the change.`); }
    setBusy(false);
  }

  // Signed out, or signed in without the admin role: a small centred card.
  if (!user || !isAdmin) return <main id="main" className="min-h-screen bg-ink px-5 py-20 text-background">
    <div className="mx-auto max-w-md">
      <a href="/" className="text-xs font-bold uppercase text-background/70">← Back to site</a>
      <div className="mt-10 border border-background/20 bg-background p-6 text-foreground sm:p-10">
        <Palette className="size-8 text-primary-text" />
        <h1 className="mt-5 font-display text-4xl">Site admin</h1>
        {!user ? <>
          <p className="mt-3 text-sm text-muted-foreground">Sign in to edit pages, prices, the fleet and courses.</p>
          <form onSubmit={emailAuth} className="mt-8 grid gap-4">
            <input name="email" type="email" required placeholder="Email" autoComplete="email" className="h-12 border border-input bg-background px-4 outline-none focus:border-primary" />
            <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className="h-12 border border-input bg-background px-4 outline-none focus:border-primary" />
            <Button disabled={busy} className="h-12 rounded-none">Sign in</Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" className="h-12 w-full rounded-none" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/admin` })}>Continue with Google</Button>
        </> : <>
          <div className="mt-4 flex items-center justify-between gap-4 text-sm"><span className="truncate text-muted-foreground">{user.email}</span><Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</Button></div>
          <div className="mt-8 border border-border bg-secondary p-5"><p className="text-sm leading-relaxed">If this is the first account connected to the site, claim administrator access below.</p><Button disabled={busy} className="mt-4 rounded-none" onClick={claimAdmin}>Claim administrator access</Button></div>
        </>}
        {message && <p className="mt-5 text-sm text-muted-foreground" role="status">{message}</p>}
      </div>
    </div>
  </main>;

  const current = SECTIONS.find(x => x.id === tab)!;
  return <div className="min-h-screen bg-secondary text-foreground">
    {/* Top bar: who you are, the site, the editor. */}
    <header className="sticky top-0 z-40 bg-ink text-background">
      <div className="flex min-h-14 items-center gap-3 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-5 text-primary-text" /> <span className="hidden sm:inline">Lakes Area Aviation</span><span className="text-background/50">Admin</span></a>
        <div className="ml-auto flex items-center gap-1">
          <a href="/" target="_blank" rel="noreferrer" className="hidden min-h-10 items-center gap-1.5 px-3 text-xs font-bold uppercase tracking-[0.12em] text-background/80 hover:text-background sm:inline-flex">View site <ArrowUpRight className="size-3.5" /></a>
          <Button className="h-10 rounded-none" onClick={() => openEditor("/")}><PencilLine className="size-4" /> <span className="hidden xs:inline sm:inline">Visual editor</span></Button>
          <Button variant="ghost" className="h-10 rounded-none text-background/80 hover:bg-background/10 hover:text-background" title={`Signed in as ${user.email ?? ""}`} onClick={() => supabase.auth.signOut()}><LogOut className="size-4" /><span className="sr-only sm:not-sr-only">Sign out</span></Button>
        </div>
      </div>
      {/* Phones and tablets: the sections as a row of tabs. */}
      <nav aria-label="Admin sections" className="flex overflow-x-auto border-t border-background/15 md:hidden">
        {SECTIONS.map(x => <button key={x.id} type="button" onClick={() => go(x.id)} aria-current={tab === x.id ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${tab === x.id ? "border-primary text-background" : "border-transparent text-background/65"}`}><x.icon className="size-4" /> {x.short}</button>)}
      </nav>
    </header>
    <div className="mx-auto flex max-w-[1400px]">
      {/* Computers: a sidebar with what each section is for. */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 flex-col border-r border-border bg-background md:flex">
        <nav aria-label="Admin sections" className="grid gap-1 p-3">
          {SECTIONS.map(x => <button key={x.id} type="button" onClick={() => go(x.id)} aria-current={tab === x.id ? "page" : undefined} className={`group flex min-h-16 items-start gap-3 border-l-2 px-3 py-3 text-left ${tab === x.id ? "border-primary bg-secondary" : "border-transparent hover:bg-secondary/60"}`}>
            <x.icon className={`mt-0.5 size-5 shrink-0 ${tab === x.id ? "text-primary-text" : "text-muted-foreground"}`} />
            <span><span className="block text-sm font-semibold">{x.label}</span><span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{x.hint}</span></span>
          </button>)}
        </nav>
        <div className="mt-auto border-t border-border p-4 text-xs leading-relaxed text-muted-foreground">
          <p>Every change can be undone from History in its section.</p>
          <p className="mt-2 truncate">Signed in as {user.email}</p>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow text-primary-text">{current.short}</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{current.label}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{current.intro}</p>
          {message && <p className="mt-5 border border-border bg-background px-4 py-3 text-sm" role="status">{message}</p>}
          <div className="mt-8">
            {tab === "edit" && <EditSiteTab />}
            {tab === "catalog" && <Panel><AdminCatalog /></Panel>}
            {tab === "prices" && <Panel><AdminRates /></Panel>}
            {tab === "settings" && <div className="grid gap-6">
              <Panel title="Accent color" text="The color of buttons and highlights across the site.">
                <div className="grid grid-cols-2 gap-3">
                  {(["blue", "orange"] as const).map(option => <Button key={option} disabled={busy} variant={theme === option ? "default" : "outline"} className="h-auto min-h-20 rounded-none p-4" onClick={() => changeTheme(option)}><span className={`size-5 rounded-full ${option === "blue" ? "theme-swatch-blue" : "theme-swatch-orange"}`} /> <span>{option === "blue" ? "Royal blue" : "Original orange"}</span>{theme === option && <Check />}</Button>)}
                </div>
              </Panel>
              <Panel title="Home page sections" text="How the flight path on the home page moves.">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Phones</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["scroll", "story"] as const).map(option => <Button key={option} disabled={busy} variant={journey === option ? "default" : "outline"} className="h-auto min-h-14 rounded-none p-4" onClick={() => changeJourney(option)}>{option === "scroll" ? "Fading scroll" : "Story mode"}{journey === option && <Check />}</Button>)}
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Laptops & desktops</p>
                <p className="mt-1 text-xs text-muted-foreground">Carousel plays each stage on its own; visitors can pause, click, use arrow keys or swipe sideways on a trackpad.</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["scroll", "carousel"] as const).map(option => <Button key={option} disabled={busy} variant={desktopJourney === option ? "default" : "outline"} className="h-auto min-h-14 rounded-none p-4" onClick={() => changeDesktopJourney(option)}>{option === "scroll" ? "Fading scroll" : "Carousel"}{desktopJourney === option && <Check />}</Button>)}
                </div>
              </Panel>
              <Panel title="3D airplanes on the maps" text="Small 3D airplanes fly the airport maps and bank through their turns. In the Private Pilot view they use pictures made from the same models.">
                <div className="grid grid-cols-2 gap-3">
                  {([false, true] as const).map(option => <Button key={String(option)} disabled={busy} variant={mapModels === option ? "default" : "outline"} className="h-auto min-h-14 rounded-none p-4" onClick={() => saveMapModels(option, mapRegs, option ? "3D airplanes are on for the maps." : "Maps show flat airplane pictures again.")}>{option ? "3D on maps" : "Off"}{mapModels === option && <Check />}</Button>)}
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Which airplanes</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MAP_MODEL_AIRCRAFT.map(({ reg, name }) => { const on = mapRegs.includes(reg); return <Button key={reg} disabled={busy || !mapModels} aria-pressed={on} variant={on ? "default" : "outline"} className="h-auto min-h-16 flex-col gap-0.5 rounded-none p-3" onClick={() => saveMapModels(true, on ? mapRegs.filter(r => r !== reg) : [...mapRegs, reg], `${name} ${on ? "now shows as a flat picture" : "now flies in 3D"} on the maps.`)}><span>{name}</span><span className="font-mono text-[11px] opacity-80">{reg}</span>{on && <Check />}</Button>; })}
                </div>
              </Panel>
              <Panel title="3D models in info cards" text="Shows 3D airplanes in the info cards on the traffic maps. The fleet page always shows photos.">
                <div className="grid grid-cols-2 gap-3">
                  {([false, true] as const).map(option => <Button key={String(option)} disabled={busy} variant={fleetModels === option ? "default" : "outline"} className="h-auto min-h-14 rounded-none p-4" onClick={() => changeFleetModels(option)}>{option ? "Enable 3D" : "3D off"}{fleetModels === option && <Check />}</Button>)}
                </div>
              </Panel>
            </div>}
          </div>
        </div>
      </main>
    </div>
  </div>;
}

type SectionId = "edit" | "catalog" | "prices" | "settings";
const SECTIONS: { id: SectionId; icon: LucideIcon; label: string; short: string; hint: string; intro: string }[] = [
  { id: "edit", icon: PencilLine, label: "Pages & photos", short: "Pages", hint: "Change words and photos on any page", intro: "Open a page in the visual editor, then click any outlined text, price or photo to change it. Nothing goes live until you press Publish." },
  { id: "catalog", icon: Plane, label: "Fleet & courses", short: "Fleet & courses", hint: "Add or hide airplanes, programs and courses", intro: "Add a new airplane, training program or specialty course, or hide one. Hidden items stay saved so you can bring them back." },
  { id: "prices", icon: CircleDollarSign, label: "Prices", short: "Prices", hint: "Rental, instruction and fees", intro: "Change a rate once and every course and page that uses it updates. You see what changes before you save." },
  { id: "settings", icon: SlidersHorizontal, label: "Appearance", short: "Appearance", hint: "Color, home page style, 3D airplanes", intro: "These switches change the whole site for every visitor as soon as you click them." },
];

const openEditor = (path: string) => { editStore.start(); window.location.assign(path); };

function Panel({ title, text, children }: { title?: string; text?: string; children: React.ReactNode }) {
  return <section className="border border-border bg-background p-5 sm:p-7">
    {title && <h2 className="font-display text-xl">{title}</h2>}
    {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    <div className={title ? "mt-4" : ""}>{children}</div>
  </section>;
}

/** Entry to the visual editor: pick a page (grouped, searchable). */
function EditSiteTab() {
  const [q, setQ] = useState("");
  const groups = groupPages(EDIT_PAGES).map(g => ({ ...g, pages: g.pages.filter(p => p.label.toLowerCase().includes(q.trim().toLowerCase())) })).filter(g => g.pages.length);
  return <div className="grid gap-6">
    <div className="flex flex-col gap-4 bg-ink p-6 text-background sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div><h2 className="font-display text-2xl">Start on the home page</h2><p className="mt-1 text-sm text-background/75">Use the page menu in the editor bar to move between pages.</p></div>
      <Button className="h-12 shrink-0 rounded-none" onClick={() => openEditor("/")}><PencilLine className="size-4" /> Open the visual editor</Button>
    </div>
    <Panel>
      <label className="flex h-12 items-center gap-2 border border-input bg-background px-3 focus-within:border-primary"><Search className="size-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a page" className="h-full flex-1 bg-transparent text-sm outline-none" /></label>
      <div className="mt-6 grid gap-6">
        {groups.map(g => <div key={g.name}>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{g.name}</p>
          <div className="mt-2 grid gap-px border border-border bg-border sm:grid-cols-2">
            {g.pages.map(p => <button key={p.path} type="button" onClick={() => openEditor(p.path)} className="group flex min-h-11 items-center justify-between gap-2 bg-background px-4 text-left text-sm hover:bg-secondary">{p.label}<PencilLine className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" /></button>)}
          </div>
        </div>)}
        {!groups.length && <p className="text-sm text-muted-foreground">No page matches “{q}”.</p>}
      </div>
    </Panel>
    <details className="border border-border bg-background p-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold">List view of every editable spot</summary><AdminContent /></details>
  </div>;
}
