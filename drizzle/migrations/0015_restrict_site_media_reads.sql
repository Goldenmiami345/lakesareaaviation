DROP POLICY IF EXISTS "Anyone can view site media" ON storage.objects;
CREATE POLICY "Admins can view site media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));