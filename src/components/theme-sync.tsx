import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccentTheme = "blue" | "orange";

export function applyAccentTheme(theme: AccentTheme) {
  document.documentElement.dataset["accent"] = theme;
}

export function ThemeSync() {
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("accent_theme").eq("id", "brand").maybeSingle();
      if (active && (data?.accent_theme === "blue" || data?.accent_theme === "orange")) applyAccentTheme(data.accent_theme);
    };
    void load();
    const channel = supabase.channel("site-theme").on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_settings", filter: "id=eq.brand" }, (payload) => {
      const theme = payload.new["accent_theme"];
      if (theme === "blue" || theme === "orange") applyAccentTheme(theme);
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);
  return null;
}