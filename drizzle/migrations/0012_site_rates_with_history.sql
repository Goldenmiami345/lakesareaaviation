CREATE TABLE public.site_rates (
  id text PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.site_rates TO anon, authenticated;
GRANT UPDATE ON public.site_rates TO authenticated;
GRANT ALL ON public.site_rates TO service_role;
ALTER TABLE public.site_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read current rates" ON public.site_rates FOR SELECT TO anon, authenticated USING (id = 'current');
CREATE POLICY "Admins can update rates" ON public.site_rates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND id = 'current' AND octet_length(config::text) <= 100000);
INSERT INTO public.site_rates (id) VALUES ('current') ON CONFLICT DO NOTHING;

CREATE TABLE public.site_rates_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL,
  note text,
  saved_at timestamptz NOT NULL,
  saved_by uuid,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_rates_history TO authenticated;
GRANT ALL ON public.site_rates_history TO service_role;
ALTER TABLE public.site_rates_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read rate history" ON public.site_rates_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.archive_site_rates() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.site_rates_history (config, note, saved_at, saved_by)
  VALUES (OLD.config, OLD.note, OLD.updated_at, OLD.updated_by);
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.archive_site_rates() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_rates_archive BEFORE UPDATE ON public.site_rates FOR EACH ROW EXECUTE FUNCTION public.archive_site_rates();