import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, LogOut, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth.user ?? null);
      const [{ data: setting }, { data: role }] = await Promise.all([
        supabase.from("site_settings").select("accent_theme").eq("id", "brand").single(),
        auth.user ? supabase.from("user_roles").select("id").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (setting?.accent_theme === "blue" || setting?.accent_theme === "orange") setTheme(setting.accent_theme);
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

  return <main id="main" className="min-h-screen bg-ink px-5 py-20 text-background">
    <div className="mx-auto max-w-xl">
      <a href="/" className="text-xs font-bold uppercase text-background/70">← Back to site</a>
      <div className="mt-10 border border-background/20 bg-background p-6 text-foreground sm:p-10">
        <Palette className="size-8 text-primary-text" />
        <h1 className="mt-5 font-display text-4xl">Site appearance</h1>
        {!user ? <>
          <p className="mt-3 text-sm text-muted-foreground">Sign in to change the accent color for every visitor.</p>
          <form onSubmit={emailAuth} className="mt-8 grid gap-4">
            <input name="email" type="email" required placeholder="Email" autoComplete="email" className="h-12 border border-input bg-background px-4 outline-none focus:border-primary" />
            <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className="h-12 border border-input bg-background px-4 outline-none focus:border-primary" />
            <Button disabled={busy} className="h-12 rounded-none">Sign in</Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" className="h-12 w-full rounded-none" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/admin` })}>Continue with Google</Button>
        </> : <>
          <div className="mt-4 flex items-center justify-between gap-4 text-sm"><span className="truncate text-muted-foreground">{user.email}</span><Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</Button></div>
          {!isAdmin ? <div className="mt-8 border border-border bg-secondary p-5"><p className="text-sm leading-relaxed">If this is the first account connected to the site, claim administrator access below.</p><Button disabled={busy} className="mt-4 rounded-none" onClick={claimAdmin}>Claim administrator access</Button></div> : <div className="mt-8 grid grid-cols-2 gap-3">
            {(["blue", "orange"] as const).map(option => <Button key={option} disabled={busy} variant={theme === option ? "default" : "outline"} className="h-auto min-h-24 rounded-none p-4" onClick={() => changeTheme(option)}><span className={`size-5 rounded-full ${option === "blue" ? "theme-swatch-blue" : "theme-swatch-orange"}`} /> <span>{option === "blue" ? "Royal blue" : "Original orange"}</span>{theme === option && <Check />}</Button>)}
          </div>}
        </>}
        {message && <p className="mt-5 text-sm text-muted-foreground" role="status">{message}</p>}
      </div>
    </div>
  </main>;
}