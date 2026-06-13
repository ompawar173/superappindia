
CREATE POLICY "rider uploads own kyc" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rider reads own kyc" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-kyc' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "rider updates own kyc" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'delivery-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rider deletes own kyc" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'delivery-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
