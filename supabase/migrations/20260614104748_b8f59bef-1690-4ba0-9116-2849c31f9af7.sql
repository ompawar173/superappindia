
-- Public read for these "public-display" buckets
CREATE POLICY "Public read vendor-products" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'vendor-products');
CREATE POLICY "Public read banners" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'banners');
CREATE POLICY "Public read category-images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'category-images');

-- Vendors upload product images into folder = their user_id
CREATE POLICY "Vendors upload own product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vendors update own product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vendors delete own product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-products' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins manage banners + category images
CREATE POLICY "Admins write banners" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'banners' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (bucket_id = 'banners' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
CREATE POLICY "Admins write category-images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'category-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (bucket_id = 'category-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));
