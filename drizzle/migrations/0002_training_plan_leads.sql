CREATE TABLE public.training_plan_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_location text NOT NULL,
  target_start_date date,
  notes text,
  ratings_held text[] NOT NULL DEFAULT '{}',
  ratings_planned text[] NOT NULL DEFAULT '{}',
  housing boolean NOT NULL DEFAULT false,
  car boolean NOT NULL DEFAULT false,
  airport_pickup boolean NOT NULL DEFAULT false,
  training_days integer NOT NULL DEFAULT 0,
  estimated_total integer NOT NULL DEFAULT 0,
  aircraft_note text,
  source_url text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.training_plan_leads TO anon, authenticated;
GRANT SELECT ON public.training_plan_leads TO authenticated;
GRANT ALL ON public.training_plan_leads TO service_role;
ALTER TABLE public.training_plan_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.training_plan_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read leads" ON public.training_plan_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX training_plan_leads_ip_time ON public.training_plan_leads (ip_hash, created_at);
CREATE OR REPLACE FUNCTION public.recent_lead_count(_ip_hash text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.training_plan_leads WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes'
$$;
REVOKE ALL ON FUNCTION public.recent_lead_count(text) FROM public;
GRANT EXECUTE ON FUNCTION public.recent_lead_count(text) TO anon, authenticated, service_role;