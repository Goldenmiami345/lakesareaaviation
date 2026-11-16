CREATE TABLE public.site_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read current content" ON public.site_content FOR SELECT TO anon, authenticated USING (id = 'current');
CREATE POLICY "Admins can update content" ON public.site_content FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND id = 'current' AND octet_length(content::text) <= 500000);
INSERT INTO public.site_content (id) VALUES ('current') ON CONFLICT DO NOTHING;

CREATE TABLE public.site_content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL,
  note text,
  saved_at timestamptz NOT NULL,
  saved_by uuid,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content_history TO authenticated;
GRANT ALL ON public.site_content_history TO service_role;
ALTER TABLE public.site_content_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read content history" ON public.site_content_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.archive_site_content() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.site_content_history (content, note, saved_at, saved_by)
  VALUES (OLD.content, OLD.note, OLD.updated_at, OLD.updated_by);
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.archive_site_content() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_content_archive BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.archive_site_content();

CREATE POLICY "Anyone can view site media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'site-media');
CREATE POLICY "Admins can upload site media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));