
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
);

CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
);

CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
);
