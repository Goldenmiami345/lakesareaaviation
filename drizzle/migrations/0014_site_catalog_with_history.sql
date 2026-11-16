CREATE TABLE public.site_catalog (
  id text PRIMARY KEY,
  catalog jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.site_catalog TO anon, authenticated;
GRANT UPDATE ON public.site_catalog TO authenticated;
GRANT ALL ON public.site_catalog TO service_role;
ALTER TABLE public.site_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read current catalog" ON public.site_catalog FOR SELECT TO anon, authenticated USING (id = 'current');
CREATE POLICY "Admins can update catalog" ON public.site_catalog FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND id = 'current' AND octet_length(catalog::text) <= 500000);
INSERT INTO public.site_catalog (id) VALUES ('current') ON CONFLICT DO NOTHING;

CREATE TABLE public.site_catalog_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog jsonb NOT NULL,
  note text,
  saved_at timestamptz NOT NULL,
  saved_by uuid,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_catalog_history TO authenticated;
GRANT ALL ON public.site_catalog_history TO service_role;
ALTER TABLE public.site_catalog_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read catalog history" ON public.site_catalog_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.archive_site_catalog() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.site_catalog_history (catalog, note, saved_at, saved_by)
  VALUES (OLD.catalog, OLD.note, OLD.updated_at, OLD.updated_by);
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.archive_site_catalog() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_catalog_archive BEFORE UPDATE ON public.site_catalog FOR EACH ROW EXECUTE FUNCTION public.archive_site_catalog();