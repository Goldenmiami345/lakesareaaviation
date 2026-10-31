import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { LEAD_RATE_LIMIT, leadSchema } from "./lead-schema";

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`laa-lead:${ip}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const submitTrainingLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: "rate_limited" | "failed" }> => {
    // Honeypot filled → pretend success, store nothing.
    if (data.website) return { ok: true };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashIp(ip);
    const { data: count, error: countError } = await supabase.rpc("recent_lead_count", { _ip_hash: ipHash });
    if (countError) console.error("lead rate check failed", countError);
    if ((count ?? 0) >= LEAD_RATE_LIMIT) return { ok: false, error: "rate_limited" };

    const { error } = await supabase.from("training_plan_leads").insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      preferred_location: data.preferredLocation,
      target_start_date: data.targetStartDate || null,
      notes: data.notes || null,
      ratings_held: data.ratingsHeld,
      ratings_planned: data.ratingsPlanned,
      housing: data.housing,
      car: data.car,
      airport_pickup: data.airportPickup,
      training_days: data.trainingDays,
      estimated_total: data.estimatedTotal,
      aircraft_note: data.aircraftNote || null,
      source_url: data.sourceUrl || null,
      ip_hash: ipHash,
    });
    if (error) {
      console.error("lead insert failed", error);
      return { ok: false, error: "failed" };
    }
    // TODO(email): send notification to golden@golden.miami once an email sender domain is verified.
    return { ok: true };
  });
