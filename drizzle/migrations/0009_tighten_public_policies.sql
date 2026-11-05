DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read the brand settings row" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (id = 'brand');

DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.training_plan_leads;
CREATE POLICY "Anyone can submit a valid lead" ON public.training_plan_leads
  FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(btrim(first_name)) BETWEEN 1 AND 100
    AND char_length(btrim(last_name)) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 320 AND email LIKE '%_@_%'
    AND char_length(phone) BETWEEN 7 AND 40
    AND char_length(preferred_location) BETWEEN 1 AND 100
    AND (notes IS NULL OR char_length(notes) <= 5000)
    AND (aircraft_note IS NULL OR char_length(aircraft_note) <= 1000)
    AND (source_url IS NULL OR char_length(source_url) <= 2000)
    AND training_days BETWEEN 0 AND 1000
    AND estimated_total BETWEEN 0 AND 10000000
    AND cardinality(ratings_held) <= 30
    AND cardinality(ratings_planned) <= 30
  );